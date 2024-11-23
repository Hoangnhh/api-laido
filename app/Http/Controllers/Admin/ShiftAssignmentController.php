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
use App\Enums\SystemConfigKey;
use Exception;
use Carbon\Carbon;

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
            $searchDate = Carbon::parse($request->date)->startOfDay();
            
            $existingAssignments = GateStaffShift::whereDate('date', $searchDate)
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
                'message' => $e->getMessage(),
                'error' => $e->getMessage()
            ]);
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
                ->where('status', Staff::STATUS_ACTIVE)
                ->with(['gateStaffShifts' => function($query) use ($date) {
                    $query->where('date', $date)
                        ->with('gate:id,name');
                }])
                ->get()
                ->map(function($staff){
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
            $date = $request->input('date');
            
            if (!$date) {
                $date = GateShift::where('queue_status', 'RUNNING')
                    ->orderBy('date', 'asc')
                    ->value('date');
                    
                if (!$date) {
                    $date = now()->format('Y-m-d');
                }
            }

            $shiftData = GateShift::where('date', $date)
                ->where('status', GateShift::STATUS_ACTIVE)
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
                        ->whereIn('status', [GateStaffShift::STATUS_CHECKIN, GateStaffShift::STATUS_CHECKOUT])
                        ->count();

                    $remainingCount = GateStaffShift::where('gate_shift_id', $shift->id)
                        ->where('status', GateStaffShift::STATUS_WAITING)
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

            // Kiểm tra xem có GateShift nào đang RUNNING không
            $runningGateShift = GateShift::where('gate_id', $request->gate_id)
                ->where('queue_status', GateShift::QUEUE_STATUS_RUNNING)
                ->where('status', GateShift::STATUS_ACTIVE)
                ->first();

            // Nếu không có GateShift RUNNING, tìm GateShift WAITING có date nhỏ nhất
            if (!$runningGateShift) {
                $waitingGateShift = GateShift::where('gate_id', $request->gate_id)
                    ->where('queue_status', GateShift::QUEUE_STATUS_WAITING)
                    ->where('status', GateShift::STATUS_ACTIVE)
                    ->orderBy('date')
                    ->first();

                // Nếu tìm thấy GateShift WAITING, update thành RUNNING
                if ($waitingGateShift) {
                    $waitingGateShift->update([
                        'queue_status' => GateShift::QUEUE_STATUS_RUNNING
                    ]);
                }
            }

            // Query base cho cả 2 danh sách
            $baseQuery = GateStaffShift::with([
                'staff:id,code,name,group_id,card_id',
                'staff.group:id,name',
                'gateShift'
            ])
                ->whereHas('gateShift', function($query) {
                    $query->where('queue_status', GateShift::QUEUE_STATUS_RUNNING)
                        ->where('status', GateShift::STATUS_ACTIVE);
                })
                ->where('gate_id', $request->gate_id);

            // Lấy danh sách WAITING
            $waitingAssignments = (clone $baseQuery)
                ->where('status', GateStaffShift::STATUS_WAITING)
                ->orderBy('index')
                ->get();

            // Nếu số lượng nhân viên WAITING < 10, lấy thêm từ ca kế tiếp
            if ($waitingAssignments->count() < 10) {
                $nextGateShift = GateShift::where('gate_id', $request->gate_id)
                    ->where('queue_status', GateShift::QUEUE_STATUS_WAITING)
                    ->where('status', GateShift::STATUS_ACTIVE)
                    ->where('date', '<=', now()->setTimezone('Asia/Ho_Chi_Minh')->format('Y-m-d'))
                    ->orderBy('date')
                    ->first();

                if ($nextGateShift) {
                    $additionalWaitingAssignments = GateStaffShift::with([
                        'staff:id,code,name,group_id,card_id',
                        'staff.group:id,name',
                        'gateShift'
                    ])
                        ->where('gate_shift_id', $nextGateShift->id)
                        ->where('status', GateStaffShift::STATUS_WAITING)
                        ->orderBy('index')
                        ->get();

                    $waitingAssignments = $waitingAssignments->merge($additionalWaitingAssignments);
                }
            }

            // Lấy danh sách CHECKIN (10 người có ID lớn nhất)
            $checkinAssignments = (clone $baseQuery)
                ->where('status', GateStaffShift::STATUS_CHECKIN)
                ->orderByDesc('id')
                ->limit(10)
                ->get();

            // Hàm format dữ liệu
            $formatAssignment = function($assignment) {
                return [
                    'id' => $assignment->id,
                    'index' => $assignment->index,
                    'staff' => [
                        'id' => $assignment->staff->id,
                        'code' => $assignment->staff->code,
                        'name' => $assignment->staff->name,
                        'card_id' => $assignment->staff->card_id,
                        'group_id' => $assignment->staff->group_id,
                        'group_name' => $assignment->staff->group?->name ?? 'Chưa phân nhóm'
                    ],
                    'status' => $assignment->status,
                    'checkin_at' => $assignment->checkin_at?->format('H:i:s'),
                    'checkout_at' => $assignment->checkout_at?->format('H:i:s'),
                    'checked_ticket_num' => $assignment->checked_ticket_num,
                    'gate_shift_id' => $assignment->gate_shift_id
                ];
            };

            return response()->json([
                'status' => 'success',
                'assignments' => [
                    'waiting' => $waitingAssignments->map($formatAssignment),
                    'checkin' => $checkinAssignments->map($formatAssignment)
                ]
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
            // Sửa validate đầu vào, thay staff_code bằng card_id
            $validated = $request->validate([
                'card_id' => 'required',
                'gate_id' => 'required|exists:gate,id',
            ]);
            
            
            // Sửa query lấy thông tin staff theo card_id
            $staff = Staff::where('card_id', $request->card_id)
                          ->where('status', Staff::STATUS_ACTIVE)
                          ->with('group:id,name')
                          ->first();
            
            if (!$staff) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Nhân viên không tồn tại',
                    'data' => null
                ]);
            }

            $staff->group_name = $staff->group ? $staff->group->name : 'Chưa phân nhóm';
            $systemConfigs = SystemConfig::getConfigs([SystemConfigKey::ENABLE_CHECKIN_BY_INDEX->value, SystemConfigKey::ENABLE_CHECKIN_ALL_GATE->value]);

            $gateStaffShift = GateStaffShift::where('staff_id', $staff->id)
                ->whereIn('status', [GateStaffShift::STATUS_WAITING, GateStaffShift::STATUS_CHECKIN])
                ->orderBy('id')
                ->first();
                
            if (!$gateStaffShift) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Không tìm thấy ca làm việc của nhân viên',
                    'data' => ['staff' => $staff]
                ]);
            }

            // trường hợp không cho phép checkin tại tất cả cổng
            if ($systemConfigs[SystemConfigKey::ENABLE_CHECKIN_ALL_GATE->value] == 0) {
                if($gateStaffShift->gate_id != $request->gate_id){ 
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Không cho phép checkin tại cổng này',
                        'data' => null
                    ]);
                }
            }
            

            $request->merge(['gate_shift_id' => $gateStaffShift->gate_shift_id, 'gate_id' => $gateStaffShift->gate_id]);
            
            // Lấy thông tin gateShift và kiểm tra trạng thái
            $gateShift = GateShift::where('id', $request->gate_shift_id)
                ->where('status', GateShift::STATUS_ACTIVE)
                ->whereIn('queue_status', [GateShift::QUEUE_STATUS_RUNNING, GateShift::QUEUE_STATUS_WAITING])
                ->first();
            

            if (!$gateShift) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ca làm việc không tồn tại',
                    'data' => ['staff' => $staff]
                ]);
            }

            // Lấy assignment và kiểm tra trạng thái
            $assignment = GateStaffShift::where('staff_id', $staff->id)
                                        ->where('gate_id', $request->gate_id)
                                        ->where('gate_shift_id', $request->gate_shift_id)
                                        ->first();

            if (!$assignment) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Nhân viên không trong hàng đợi',
                    'data' => ['staff' => $staff]
                ]);
            }

            if ($assignment->status !== GateStaffShift::STATUS_WAITING) {
                switch ($assignment->status) {
                    case GateStaffShift::STATUS_CHECKIN:
                        $message = 'Nhân viên đã checkin';
                        break;
                    default:
                        $message = 'Nhân viên không trong hàng đợi';
                }
                return response()->json([
                    'status' => 'error',
                    'message' => $message,
                    'data' => ['staff' => $staff]
                ]);
            }

            // Kiểm tra theo index nếu config cho phép
            if ($systemConfigs[SystemConfigKey::ENABLE_CHECKIN_BY_INDEX->value] == 1) {
                // Kiểm tra xem có phải index nhỏ nhất trong danh sách chờ không
                $minWaitingIndex = GateStaffShift::where('gate_shift_id', $request->gate_shift_id)
                                                ->where('status', GateStaffShift::STATUS_WAITING)
                                                ->min('index');

                if ($assignment->index !== $minWaitingIndex) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Chưa đến lượt checkin',
                        'data' => ['staff' => $staff]
                    ]);
                }
            }

            DB::beginTransaction();

            $assignment->update([
                'status' => GateStaffShift::STATUS_CHECKIN,
                'checkin_at' => now(),
                'checked_ticket_num' => 0
            ]);

            if ($assignment->index > $gateShift->current_index) {
                $gateShift->update(['current_index' => $assignment->index]);
            }

            // Kiểm tra số lượng nhân viên WAITING
            $waitingStaffCount = GateStaffShift::where('gate_shift_id', $request->gate_shift_id)
                                               ->where('status', GateStaffShift::STATUS_WAITING)
                                               ->count();

            // Nếu không còn nhân viên nào WAITING, cập nhật trạng thái GateShift
            if ($waitingStaffCount == 0) {
                $gateShift->update(['queue_status' => GateShift::QUEUE_STATUS_CHECKIN_ALL]);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Checkin thành công',
                'data' => [
                    'staff' => $staff,
                    'assignment' => [
                        'index' => $assignment->index,
                        'status' => GateStaffShift::STATUS_CHECKIN,
                        'checkin_at' => now()->format('H:i:s'),
                    ]
                ]
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Checkin thất bại - ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Checkout cho nhân viên
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function staffCheckout(Request $request)
    {
        try {
            $validated = $request->validate([
                'card_id' => 'required',
            ]);

            // Tìm nhân viên theo card_id
            $staff = Staff::where('card_id', $request->card_id)
                          ->where('status', Staff::STATUS_ACTIVE)
                          ->with('group:id,name')
                          ->first();
            
            if (!$staff) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Nhân viên không tồn tại',
                    'data' => null
                ]);
            }

            $staff->group_name = $staff->group ? $staff->group->name : 'Chưa phân nhóm';

            // Tìm assignment đang CHECKIN của nhân viên
            $assignment = GateStaffShift::where('staff_id', $staff->id)
                                        ->where('status', GateStaffShift::STATUS_CHECKIN)
                                        ->with(['gate:id,name', 'checkedTickets'])
                                        ->orderBy('checkin_at', 'desc')
                                        ->first();

            if (!$assignment) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Không tìm thấy ca làm việc đang checkin của nhân viên',
                    'data' => ['staff' => $staff]
                ]);
            }

            DB::beginTransaction();
            try {
                // Cập nhật trạng thái assignment
                $assignment->update([
                    'status' => GateStaffShift::STATUS_CHECKOUT,
                    'checkout_at' => now()
                ]);

                // Kiểm tra xem còn nhân viên nào đang CHECKIN trong ca không
                $remainingCheckinStaff = GateStaffShift::where('gate_shift_id', $assignment->gate_shift_id)
                                                      ->whereIn('status', [GateStaffShift::STATUS_CHECKIN, GateStaffShift::STATUS_WAITING])
                                                      ->count();

                // Nếu không còn ai CHECKIN, cập nhật trạng thái GateShift
                if ($remainingCheckinStaff === 0) {
                    GateShift::where('id', $assignment->gate_shift_id)->update([
                        'queue_status' => GateShift::QUEUE_STATUS_COMPLETED
                    ]);
                }

                // Format dữ liệu checked tickets
                $checkedTickets = $assignment->checkedTickets->map(function($ticket) {
                    return [
                        'id' => $ticket->id,
                        'name' => $ticket->name,
                        'code' => $ticket->code,
                        'checkin_at' => $ticket->checkin_at->format('H:i:s'),
                        'checkout_at' => $ticket->checkout_at != null ? $ticket->checkout_at->format('H:i:s') : '',
                        'is_checkout_with_other' => $ticket->is_checkout_with_other,
                        'status' => $ticket->status
                    ];
                });

                // Tính toán thời gian làm việc
                $workingTime = abs(now()->diffInMinutes($assignment->checkin_at));
                $hours = floor($workingTime / 60);
                $minutes = $workingTime % 60;

                DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Checkout thành công',
                    'data' => [
                        'staff' => $staff,
                        'shift_info' => [
                            'gate_name' => $assignment->gate->name,
                            'checkin_at' => $assignment->checkin_at->format('H:i:s'),
                            'checkout_at' => now()->format('H:i:s'),
                            'working_time' => sprintf('%02d:%02d:%02d', $hours, $minutes, 0),
                            'total_tickets' => $checkedTickets->count()
                        ],
                        'checked_tickets' => $checkedTickets
                    ]
                ]);

            } catch (Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Checkout thất bại - ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 