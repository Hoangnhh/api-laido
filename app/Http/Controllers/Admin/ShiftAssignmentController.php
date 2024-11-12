<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gate;
use App\Models\StaffGroup;
use App\Models\Staff;
use App\Models\GateShift;
use App\Models\GateStaffShift;
use App\Models\SystemConfig;
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

    /**
     * Lấy thông tin dashboard phân ca
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAssignmentDashboard(Request $request)
    {
        try {
            $date = $request->input('date') ?? SystemConfig::getConfig('CURRENT_SHIFT_DATE');
            
            if (!$date) {
                $date = now()->format('Y-m-d');
            }

            $shiftData = GateShift::where('date', $date)
                ->where('status', 'ACTIVE')
                ->with(['staffGroup:id,name', 'gate:id,name'])
                ->withCount('gateStaffShifts')
                ->get()
                ->map(function ($shift) {
                    // Lấy thống kê index
                    $indexStats = GateStaffShift::where('gate_shift_id', $shift->id)
                        ->selectRaw('MIN(`index`) as min_index, MAX(`index`) as max_index')
                        ->first();

                    // Nếu current_index = 0 thì gán bằng min_index
                    $currentIndex = $shift->current_index == 0 ? 
                        $indexStats->min_index : 
                        $shift->current_index;

                    // Đếm số người đã và chưa checkin
                    $checkedInCount = GateStaffShift::where('gate_shift_id', $shift->id)
                        ->where('index', '<', $currentIndex)
                        ->count();

                    $remainingCount = GateStaffShift::where('gate_shift_id', $shift->id)
                        ->where('index', '>=', $currentIndex)
                        ->count();

                    return [
                        'id' => $shift->id,
                        'gate_id' => $shift->gate->id,
                        'gate_name' => $shift->gate->name,
                        'staff_group_id' => $shift->staffGroup->id,
                        'staff_group_name' => $shift->staffGroup->name,
                        'staff_count' => $shift->gate_staff_shifts_count,
                        'min_index' => $indexStats->min_index,
                        'max_index' => $indexStats->max_index,
                        'current_index' => $currentIndex,
                        'checked_in_count' => $checkedInCount,
                        'remaining_count' => $remainingCount,
                        'total_staff' => $checkedInCount + $remainingCount
                    ];
                });

            return response()->json([
                'status' => 'success',
                'date' => $date,
                'shifts' => $shiftData,
            ]);

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi lấy thông tin dashboard',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lấy danh sách phân ca theo cửa
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAssignmentByGate(Request $request)
    {
        try {
            $validated = $request->validate([
                'gate_id' => 'required|exists:gate,id'
            ]);

            $assignments = GateStaffShift::with([
                'staff:id,code,name,group_id',
                'staff.group:id,name',
                'gateShift'
            ])
                ->whereHas('gateShift', function($query) {
                    $query->where('queue_status', GateShift::QUEUE_STATUS_RUNNING)
                        ->where('status', 'ACTIVE');
                })
                ->where('gate_id', $request->gate_id)
                ->orderBy('index')
                ->get()
                ->map(function($assignment) {
                    return [
                        'index' => $assignment->index,
                        'staff' => [
                            'id' => $assignment->staff->id,
                            'code' => $assignment->staff->code,
                            'name' => $assignment->staff->name,
                            'group_id' => $assignment->staff->group_id,
                            'group_name' => $assignment->staff->group?->name ?? 'Chưa phân nhóm'
                        ],
                        'status' => $assignment->status,
                        'checkin_at' => $assignment->checkin_at?->format('H:i:s'),
                        'checkout_at' => $assignment->checkout_at?->format('H:i:s'),
                        'checked_ticket_num' => $assignment->checked_ticket_num,
                        'gate_shift_id' => $assignment->gate_shift_id
                    ];
                });

            return response()->json([
                'status' => 'success',
                'assignments' => $assignments
            ]);

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi lấy danh sách phân ca',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Checkin cho nhân viên
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function staffCheckin(Request $request)
    {
        try {
            // Validate đầu vào
            $validated = $request->validate([
                'staff_code' => 'required|exists:staff,code',
                'gate_id' => 'required|exists:gate,id',
                'gate_shift_id' => 'required|exists:gate_shift,id'
            ]);

            // Lấy thông tin staff
            $staff = Staff::where('code', $request->staff_code)
                         ->where('status', Staff::STATUS_ACTIVE)
                         ->first();

            // Chuẩn bị response cơ bản với thông tin nhân viên
            $response = [
                'staff' => $staff ? [
                    'id' => $staff->id,
                    'code' => $staff->code,
                    'avatar_url' => $staff->avatar_url,
                    'name' => $staff->name,
                    'group_name' => $staff->group?->name ?? 'Chưa phân nhóm',
                    'status' => $staff->status
                ] : null
            ];

            if (!$staff) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Nhân viên không tồn tại hoặc đã bị khóa',
                    'data' => $response
                ], 422);
            }

            // Kiểm tra gate
            $gate = Gate::find($request->gate_id);
            if ($gate->status !== Gate::STATUS_ACTIVE) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cửa này hiện không hoạt động',
                    'data' => $response
                ], 422);
            }

            // Kiểm tra ca làm việc
            $gateShift = GateShift::find($request->gate_shift_id);
            if ($gateShift->status !== GateShift::STATUS_ACTIVE || $gateShift->queue_status !== GateShift::QUEUE_STATUS_RUNNING) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ca làm việc này đã kết thúc hoặc tạm dừng',
                    'data' => $response
                ], 422);
            }

            // Lấy assignment
            $assignment = GateStaffShift::where('staff_id', $staff->id)
                                      ->where('gate_id', $request->gate_id)
                                      ->where('gate_shift_id', $request->gate_shift_id)
                                      ->first();

            if (!$assignment) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Không tìm thấy lịch phân ca cho nhân viên này',
                    'data' => $response
                ], 422);
            }

            // Thêm thông tin assignment vào response
            $response['assignment'] = [
                'index' => $assignment->index,
                'status' => $assignment->status,
                'checkin_at' => $assignment->checkin_at?->format('H:i:s'),
                'gate_name' => $gate->name
            ];

            if ($assignment->status !== GateStaffShift::STATUS_WAITING) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Nhân viên đã checkin hoặc đã qua lượt',
                    'data' => $response
                ], 422);
            }

            DB::beginTransaction();
            try {
                // Kiểm tra xem có phải index nhỏ nhất trong danh sách chờ không
                $minWaitingIndex = GateStaffShift::where('gate_id', $request->gate_id)
                    ->where('gate_shift_id', $request->gate_shift_id)
                    ->where('status', GateStaffShift::STATUS_WAITING)
                    ->min('index');
                
                if ($assignment->index !== $minWaitingIndex) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Chưa đến lượt checkin',
                        'data' => $response
                    ], 422);
                }

                $assignment->update([
                    'status' => GateStaffShift::STATUS_CHECKIN,
                    'checkin_at' => now(),
                    'checked_ticket_num' => 0
                ]);

                if ($assignment->index > $gateShift->current_index) {
                    $gateShift->update([
                        'current_index' => $assignment->index
                    ]);
                }

                // Kiểm tra số lượng nhân viên đã checkin
                $totalStaff = GateStaffShift::where('gate_shift_id', $request->gate_shift_id)->count();
                $checkedInStaff = GateStaffShift::where('gate_shift_id', $request->gate_shift_id)
                    ->where('status', GateStaffShift::STATUS_CHECKIN)
                    ->count();
                
                // Nếu là nhân viên đầu tiên checkin
                if ($checkedInStaff == 0) {
                    $gateShift->update([
                        'queue_status' => GateShift::QUEUE_STATUS_RUNNING
                    ]);
                }
                // Nếu là nhân viên cuối cùng checkin
                else if ($checkedInStaff == $totalStaff - 1) {
                    $gateShift->update([
                        'queue_status' => GateShift::QUEUE_STATUS_COMPLETED  
                    ]);
                    
                    // Thêm trạng thái shift_end vào response
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Checkin thành công',
                        'data' => array_merge($response, ['shift_end' => true])
                    ]);
                }

                DB::commit();

                // Cập nhật thông tin assignment trong response
                $response['assignment']['status'] = GateStaffShift::STATUS_CHECKIN;
                $response['assignment']['checkin_at'] = now()->format('H:i:s');

                return response()->json([
                    'status' => 'success',
                    'message' => 'Checkin thành công',
                    'data' => array_merge($response, ['shift_end' => false])
                ]);

            } catch (Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi checkin',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    
} 