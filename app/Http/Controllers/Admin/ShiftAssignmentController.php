<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gate;
use App\Models\StaffGroup;
use App\Models\Staff;
use App\Models\GateShift;
use App\Models\GateStaffShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class ShiftAssignmentController extends Controller
{
    public function getData()
    {
        $gates = Gate::select('id', 'name')
                    ->where('status', 'ACTIVE')
                    ->orderBy('id')
                    ->get();
                    
        $staffGroups = StaffGroup::select('id', 'name')
                                ->withCount('staffs')
                                ->where('status', 'ACTIVE')
                                ->orderBy('name')
                                ->get();

        return response()->json([
            'gates' => $gates,
            'shifts' => $staffGroups
        ]);
    }

    public function createShiftAssignment(Request $request)
    {
        try {
            // Validate đầu vào
            $validated = $request->validate([
                'date' => [
                    'required',
                    'date_format:Y-m-d',
                    function ($attribute, $value, $fail) {
                        if (strtotime($value) < strtotime(date('Y-m-d'))) {
                            $fail('Không thể tạo ca làm việc cho ngày trong quá khứ');
                        }
                    },
                ],
                'staff_group_id' => 'required|exists:staff_group,id',
                'gate_ids' => 'required|array',
                'gate_ids.*' => 'exists:gate,id',
                'staff_ids' => 'required|array',
                'staff_ids.*' => 'exists:staff,id'
            ]);

            // Kiểm tra thêm một lần nữa để đảm bảo
            $selectedDate = strtotime($request->date);
            $today = strtotime(date('Y-m-d'));
            
            if ($selectedDate < $today) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Không thể tạo ca làm việc cho ngày trong quá khứ'
                ], 422);
            }

            // Kiểm tra trạng thái của các Gate
            $inactiveGates = Gate::whereIn('id', $request->gate_ids)
                ->where('status', '!=', 'ACTIVE')
                ->get();
                
            if ($inactiveGates->isNotEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Các vị trí sau đang không hoạt động: ' . 
                        $inactiveGates->pluck('name')->join(', ')
                ], 422);
            }

            // Kiểm tra trạng thái của các Staff
            $inactiveStaffs = Staff::whereIn('id', $request->staff_ids)
                ->where('status', '!=', 'ACTIVE')
                ->get();

            if ($inactiveStaffs->isNotEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Các nhân viên sau đang không hoạt động: ' . 
                        $inactiveStaffs->pluck('name')->join(', ')
                ], 422);
            }

            // Kiểm tra xem nhân viên có thuộc nhóm không
            $staffCount = Staff::whereIn('id', $request->staff_ids)
                ->where('group_id', $request->staff_group_id)
                ->where('status', 'ACTIVE')
                ->count();

            if ($staffCount !== count($request->staff_ids)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Một số nhân viên không thuộc nhóm này'
                ], 422);
            }

            // Kiểm tra xem có nhân viên nào đã được phân ca trong ngày chưa
            $existingAssignments = GateStaffShift::where('date', $request->date)
                ->whereIn('staff_id', $request->staff_ids)
                ->with('staff:id,name,code')
                ->get();

            if ($existingAssignments->isNotEmpty()) {
                $assignedStaffs = $existingAssignments->map(function($assignment) {
                    return $assignment->staff->name . ' (' . $assignment->staff->code . ')';
                })->join(', ');

                return response()->json([
                    'status' => 'error',
                    'message' => 'Các nhân viên sau đã được phân ca trong ngày: ' . $assignedStaffs
                ], 422);
            }

            DB::beginTransaction();
            try {
                $gateShifts = [];
                $gateStaffShifts = [];
                $staffIndex = 0;

                // Lấy index lớn nhất của nhóm trong ngày (across all gates)
                $maxGroupIndex = GateStaffShift::where('date', $request->date)
                    ->whereHas('gateShift', function($query) use ($request) {
                        $query->where('staff_group_id', $request->staff_group_id);
                    })
                    ->max('index') ?? 0;

                $startIndex = $maxGroupIndex + 1;

                // Tạo danh sách phân ca cho từng gate
                foreach ($request->gate_ids as $index => $gateId) {
                    // Kiểm tra xem đã có GateShift cho ngày và nhóm này chưa
                    $existingGateShift = GateShift::where('date', $request->date)
                        ->where('gate_id', $gateId)
                        ->where('staff_group_id', $request->staff_group_id)
                        ->where('status', 'ACTIVE')
                        ->first();

                    // Sử dụng GateShift hiện có hoặc tạo mới
                    $gateShift = $existingGateShift ?? GateShift::create([
                        'staff_group_id' => $request->staff_group_id,
                        'gate_id' => $gateId,
                        'date' => $request->date,
                        'current_index' => $maxGroupIndex,
                        'status' => 'ACTIVE'
                    ]);

                    $staffCountForGate = floor(count($request->staff_ids) / count($request->gate_ids))
                        + ($index < (count($request->staff_ids) % count($request->gate_ids)) ? 1 : 0);
                    
                    // Tạo GateStaffShift cho từng nhân viên với index liên tục
                    for ($i = 0; $i < $staffCountForGate; $i++) {
                        GateStaffShift::create([
                            'date' => $request->date,
                            'gate_shift_id' => $gateShift->id,
                            'index' => $startIndex + $staffIndex,  // Sử dụng staffIndex để tăng liên tục
                            'gate_id' => $gateId,
                            'staff_id' => $request->staff_ids[$staffIndex],
                            'status' => 'WAITING'
                        ]);
                        $staffIndex++;
                    }
                }

                DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Phân ca thành công',
                    'data' => [
                        'gate_shifts' => $gateShifts,
                        'gate_staff_shifts' => $gateStaffShifts
                    ]
                ], 201);

            } catch (Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi phân ca',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStaffsByGroup(Request $request)
    {
        try {
            $date = $request->query('date');
            $groupId = $request->query('groupId');
            if (!$date) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ngày không được để trống'
                ], 422);
            }

            $staffs = Staff::where('group_id', $groupId)
                ->where('status', 'ACTIVE')
                ->with(['gateStaffShifts' => function($query) use ($date) {
                    $query->where('date', $date)
                        ->with('gate:id,name');
                }])
                ->get()
                ->map(function($staff) {
                    $assignment = $staff->gateStaffShifts->first();
                    return [
                        'id' => $staff->id,
                        'name' => $staff->name,
                        'code' => $staff->code,
                        'is_assigned' => !is_null($assignment),
                        'assignment' => $assignment ? [
                            'index' => $assignment->index,
                            'gate_name' => $assignment->gate->name
                        ] : null
                    ];
                });

            return response()->json([
                'status' => 'success',
                'staffs' => $staffs
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi lấy danh sách nhân viên',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 