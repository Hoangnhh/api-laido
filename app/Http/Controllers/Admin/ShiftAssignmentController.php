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
use App\Models\ExtraShift;
use App\Models\ActionLog;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\CheckedTicket;
use App\Models\Ticket;

class ShiftAssignmentController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

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
                'staff_ids.*' => 'exists:staff,id',
                'push_notification' => 'nullable|boolean'
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
            $gateStaffShiftIds = [];

            DB::beginTransaction();
            try {

                // Lấy danh sách nhân viên được chọn
                $selectedStaffs = Staff::whereIn('id', $request->staff_ids)
                    ->where('status', Staff::STATUS_ACTIVE)
                    ->get();

                // Tách nhân viên theo loại phương tiện
                $doStaffs = $selectedStaffs->where('vehical_type', Staff::VEHICAL_TYPE_DO)->values();
                $xuongStaffs = $selectedStaffs->where('vehical_type', Staff::VEHICAL_TYPE_XUONG)->values();

                // Lấy index lớn nhất của nhóm trong ngày (across all gates)
                $maxGroupIndex = GateStaffShift::where('date', $request->date)
                    ->whereHas('gateShift', function($query) use ($request) {
                        $query->where('staff_group_id', $request->staff_group_id);
                    })
                    ->max('index') ?? 0;

                $startIndex = $maxGroupIndex + 1;
                $currentIndex = $startIndex;

                // Phân bổ nhân viên lái đò
                $doStaffsPerGate = floor($doStaffs->count() / count($request->gate_ids));
                $doRemainder = $doStaffs->count() % count($request->gate_ids);
                $doStaffIndex = 0;

                // Phân bổ nhân viên lái xuồng
                $xuongStaffsPerGate = floor($xuongStaffs->count() / count($request->gate_ids));
                $xuongRemainder = $xuongStaffs->count() % count($request->gate_ids);
                $xuongStaffIndex = 0;

                // Tạo danh sách phân ca cho từng gate
                foreach ($request->gate_ids as $index => $gateId) {
                    // Kiểm tra xem đã có GateShift cho ngày và nhóm này chưa
                    $existingGateShift = GateShift::where('date', $request->date)
                        ->where('gate_id', $gateId)
                        ->where('staff_group_id', $request->staff_group_id)
                        ->where('status', GateShift::STATUS_ACTIVE)
                        ->first();

                    // Tính số lượng nhân viên cho gate này
                    $doStaffCountForGate = $doStaffsPerGate + ($index < $doRemainder ? 1 : 0);
                    $xuongStaffCountForGate = $xuongStaffsPerGate + ($index < $xuongRemainder ? 1 : 0);

                    // Bỏ qua nếu không có nhân viên nào được phân bổ
                    if ($doStaffCountForGate == 0 && $xuongStaffCountForGate == 0) {
                        continue;
                    }

                    // Sử dụng GateShift hiện có hoặc tạo mới
                    $gateShift = $existingGateShift ?? GateShift::create([
                        'staff_group_id' => $request->staff_group_id,
                        'gate_id' => $gateId,
                        'date' => $request->date,
                        'current_index' => $maxGroupIndex,
                        'status' => 'ACTIVE'
                    ]);

                    // Tạo GateStaffShift cho nhân viên lái đò
                    for ($i = 0; $i < $doStaffCountForGate; $i++) {
                        if ($doStaffIndex < $doStaffs->count()) {
                            $gateStaffShift = GateStaffShift::create([
                                'date' => $request->date,
                                'gate_shift_id' => $gateShift->id,
                                'index' => $currentIndex,
                                'gate_id' => $gateId,
                                'staff_id' => $doStaffs[$doStaffIndex]->id,
                                'status' => GateStaffShift::STATUS_WAITING
                            ]);
                            $gateStaffShiftIds[] = $gateStaffShift->id;
                            $currentIndex++;
                            $doStaffIndex++;
                        }
                    }

                    // Tạo GateStaffShift cho nhân viên lái xuồng
                    for ($i = 0; $i < $xuongStaffCountForGate; $i++) {
                        if ($xuongStaffIndex < $xuongStaffs->count()) {
                            $gateStaffShift = GateStaffShift::create([
                                'date' => $request->date,
                                'gate_shift_id' => $gateShift->id,
                                'index' => $currentIndex,
                                'gate_id' => $gateId,
                                'staff_id' => $xuongStaffs[$xuongStaffIndex]->id,
                                'status' => GateStaffShift::STATUS_WAITING
                            ]);
                            $gateStaffShiftIds[] = $gateStaffShift->id;
                            $currentIndex++;
                            $xuongStaffIndex++;
                        }
                    }
                }

                DB::commit();

                // Gửi thông báo nếu được yêu cầu
                if ($request->push_notification) {
                    try {
                        $this->notificationService->pushShiftNotiForMultiple($gateStaffShiftIds);
                    } catch (Exception $e) {
                        Log::error('Error pushing shift notification: ' . $e->getMessage());
                    }
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Phân ca thành công'
                ], 201);

            } catch (Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
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
                        ->where('gate_shift_id', '!=', 0)
                        ->with('gate:id,name');
                }])
                ->get()
                ->map(function($staff){
                    $assignment = $staff->gateStaffShifts->first();
                    return [
                        'id' => $staff->id,
                        'name' => $staff->name,
                        'code' => $staff->code,
                        'vehical_type' => $staff->vehical_type,
                        'default_gate_id' => $staff->default_gate_id,
                        'vehical_type_name' => Staff::getVehicalTypeName($staff->vehical_type),
                        'is_assigned' => !is_null($assignment),
                        'assignment' => $assignment && isset($assignment->gate->name) ? [
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
                'error' => $e->getMessage() . ' at line ' . $e->getLine()
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
                $date = GateShift::whereIn('queue_status', [GateShift::QUEUE_STATUS_RUNNING, GateShift::QUEUE_STATUS_WAITING])
                    ->where('status', GateShift::STATUS_ACTIVE)
                    ->orderBy('date', 'asc')
                    ->orderBy('queue_status', 'asc')
                    ->value('date');

                if (!$date) {
                    $date = now()->format('Y-m-d');
                }
            }

            $shiftData = GateShift::where('date', $date)
                ->where('status', GateShift::STATUS_ACTIVE)
                ->with([
                    'staffGroup:id,name', 
                    'gate:id,name',
                    'gateStaffShifts.staff:id,name,code'
                ])
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

                    // Lấy danh sách staff
                    $staffList = $shift->gateStaffShifts->map(function ($gateStaffShift) {
                        return [
                            'id' => $gateStaffShift->staff->id,
                            'name' => $gateStaffShift->staff->name,
                            'code' => $gateStaffShift->staff->code,
                            'status' => $gateStaffShift->status
                        ];
                    });

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
                        'total_staff' => $checkedInCount + $remainingCount,
                        'staff_list' => $staffList
                    ];
                });
            // Lấy danh sách ExtraShift trong ngày
            $extraShifts = ExtraShift::where('date', $date)
                ->where('status', ExtraShift::STATUS_ACTIVE)
                ->with(['staff' => function($query) {
                    $query->select('id', 'code', 'name', 'group_id');
                }])
                ->get()
                ->map(function($extraShift) {
                    return [
                        'staff_code' => $extraShift->staff->code,
                        'staff_name' => $extraShift->staff->name,
                        'group_id' => $extraShift->staff->group_id,
                    ];
                });

            return response()->json([
                'status' => 'success',
                'date' => $date,
                'shifts' => $shiftData,
                'extra_shifts' => $extraShifts
            ]);

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi lấy thông tin dashboard',
                'error' => $e->getMessage() . ' at line ' . $e->getLine()
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
                'staff:id,code,name,group_id,card_id,vehical_type',
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
                        'staff:id,code,name,group_id,card_id,vehical_type',
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
                        'vehical_type' => $assignment->staff->vehical_type,
                        'vehical_type_name' => Staff::getVehicalTypeName($assignment->staff->vehical_type),
                        'group_name' => $assignment->staff->group?->name ?? 'Chưa phân nhóm'
                    ],
                    'status' => $assignment->status,
                    'checkin_at' => $assignment->checkin_at?->format('H:i:s'),
                    'checkout_at' => $assignment->checkout_at?->format('H:i:s'),
                    'checked_ticket_num' => $assignment->checked_ticket_num,
                    'gate_shift_id' => $assignment->gate_shift_id
                ];
            };

            // Tách danh sách theo vehical_type
            $type1Assignments = [];
            $type2Assignments = [];

            foreach ($waitingAssignments as $assignment) {
                $formattedAssignment = $formatAssignment($assignment);
                if ($assignment->staff->vehical_type === Staff::VEHICAL_TYPE_DO) {
                    $type1Assignments[] = $formattedAssignment;
                } else if ($assignment->staff->vehical_type === Staff::VEHICAL_TYPE_XUONG) {
                    $type2Assignments[] = $formattedAssignment;
                }
            }

            return response()->json([
                'status' => 'success',
                'assignments' => [
                    'type_1' => $type1Assignments,
                    'type_2' => $type2Assignments
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
     * Lấy danh sách phân ca theo cửa
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAssignmentByGateOld(Request $request)
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
            $originalGateId = $request->gate_id;
            
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
                ->orderBy('date')
                ->first();
                
            if (!$gateStaffShift) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Nhân viên không trong ca làm việc',
                    'data' => [
                        'staff' => $staff
                    ]
                ]);
            }

            // ========== XỬ LÝ CHECKIN EXTRA SHIFT ==========
            // Lấy danh sách ExtraShift của ngày hiện tại
            $extraShifts = ExtraShift::where('date', Carbon::today()->format('Y-m-d'))
                ->where('staff_id', $staff->id)
                ->where('status', ExtraShift::STATUS_ACTIVE)
                ->first();

            if($extraShifts && $gateStaffShift->status == GateStaffShift::STATUS_CHECKIN){
                $gateStaffShift->update([
                    'status' => GateStaffShift::STATUS_CHECKIN,
                    'checkin_at' => now(),
                    'checkin_gate_id' => $originalGateId,
                    'checked_ticket_num' => -50
                ]);

                $extraShifts->update([
                    'recheckin_times' => $extraShifts->recheckin_times + 1,
                ]);
                
                return response()->json([
                    'status' => 'success',
                    'message_color' => 'success',
                    'message' => 'Checkin thành công lần thứ ' . $extraShifts->recheckin_times,
                    'data' => [
                        'staff' => $staff,
                        'assignment' => [
                            'index' => $gateStaffShift->index || "000",
                        ]
                    ]
                ]);
            }
            // ========== END XỬ LÝ CHECKIN EXTRA SHIFT ==========

            // trường hợp không cho phép checkin tại tất cả cổng
            if ($systemConfigs[SystemConfigKey::ENABLE_CHECKIN_ALL_GATE->value] == 0) {
                if($gateStaffShift->gate_id != $request->gate_id){ 
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Không cho phép checkin tại cổng này',
                        'data' => [
                            'staff' => $staff,
                            'assignment' => [
                                'index' => $gateStaffShift->index || "000",
                            ]
                        ]
                    ]);
                }
            }
            

            $request->merge(['gate_shift_id' => $gateStaffShift->gate_shift_id, 'gate_id' => $gateStaffShift->gate_id]);
            

            // Lấy assignment và kiểm tra trạng thái
            $assignment = GateStaffShift::where('staff_id', $staff->id)
                                        ->where('gate_id', $request->gate_id)
                                        ->where('gate_shift_id', $request->gate_shift_id)
                                        ->first();

            if (!$assignment) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Nhân viên không trong hàng đợi',
                    'data' => [
                        'staff' => $staff,
                        'assignment' => [
                            'index' => $gateStaffShift->index || "000",
                        ]
                    ]
                ]);
            }

             // Lấy danh sách vé đã check trong ngày của ca này và của staff này
             $checkedTickets = CheckedTicket::getTicketsByStaffToday($staff->id);

            // if ($assignment->status !== GateStaffShift::STATUS_WAITING) {
            //     switch ($assignment->status) {
            //         case GateStaffShift::STATUS_CHECKIN:
            //             $message = 'Nhân viên đã checkin';
            //             break;
            //         default:
            //             $message = 'Nhân viên không trong hàng đợi';
            //     }
            //     return response()->json([
            //         'status' => 'error',
            //         'message' => $message,
            //         'data' => [
            //             'staff' => $staff,
            //             'assignment' => [
            //                 'index' => $assignment->index || "000",
            //             ],
            //             'checked_tickets' => $checkedTickets
            //         ]
            //     ]);
            // }
            
            // Lấy thông tin gateShift và kiểm tra trạng thái
            $gateShift = GateShift::where('id', $request->gate_shift_id)
                ->where('status', GateShift::STATUS_ACTIVE)
                ->whereIn('queue_status', [GateShift::QUEUE_STATUS_RUNNING, GateShift::QUEUE_STATUS_WAITING, GateShift::QUEUE_STATUS_CHECKIN_ALL])
                ->orderBy('date', 'asc')
                ->first();
            

            if (!$gateShift) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ca làm việc đã kết thúc',
                    'data' => [
                        'staff' => $staff,
                        'assignment' => [
                            'index' => $gateStaffShift->index || "000",
                        ]
                    ]
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
                        'data' => [
                            'staff' => $staff,
                            'assignment' => [
                                'index' => $assignment->index || "000",
                            ]
                        ]
                    ]);
                }
            }
            $lastStatus = $assignment->status;

            DB::beginTransaction();

            $assignment->update([
                'status' => GateStaffShift::STATUS_CHECKIN,
                'checkin_gate_id' => $originalGateId,
                'checked_ticket_num' => 0
            ]);

            if ($systemConfigs[SystemConfigKey::ENABLE_CHECKIN_BY_INDEX->value] == 0 && $assignment->index > $gateShift->current_index) {
                $gateShift->update(['current_index' => $assignment->index]);
            }

            // Kiểm tra số lượng nhân viên WAITING
            $waitingStaffCount = GateStaffShift::where('gate_shift_id', $gateShift->id)
                                               ->where('status', GateStaffShift::STATUS_WAITING)
                                               ->count();

            // Nếu không còn nhân viên nào WAITING, cập nhật trạng thái GateShift
            if ($waitingStaffCount == 0) {
                $gateShift->update(['queue_status' => GateShift::QUEUE_STATUS_CHECKIN_ALL]);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message_color' => $lastStatus == GateStaffShift::STATUS_CHECKIN ? 'warning' : 'success',
                'message' => $lastStatus == GateStaffShift::STATUS_CHECKIN ? 'Mời quét vé' : 'Checkin thành công',
                'data' => [
                    'staff' => $staff,
                    'assignment' => [
                        'index' => $assignment->index,
                        'status' => GateStaffShift::STATUS_CHECKIN,
                        'last_status' => $lastStatus,
                        'checkin_at' => now()->format('H:i:s'),
                    ],
                    'checked_tickets' => $checkedTickets
                ]
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Checkin thất bại - ' . $e->getMessage() . ' - Line: ' . $e->getLine(),
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

    /**
     * Xóa gate shift và các gate staff shift liên quan
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function deleteGateShift(Request $request)
    {
        try {
            $gateShiftId = $request->input('gate_shift_id');
            
            DB::beginTransaction();
            
            $gateShift = GateShift::find($gateShiftId);
            if (!$gateShift) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy ca làm việc'
                ], 404);
            }

            // Trường hợp 1: GateShift đang có queue_status = 'WAITING'
            if ($gateShift->queue_status === GateShift::QUEUE_STATUS_WAITING) {
                $gateShift->update([
                    'status' => GateShift::STATUS_INACTIVE,
                    'updated_by' => Auth::user()->username
                ]);
            }
            
            // Trường hợp 2: GateShift có queue_status != WAITING và status = ACTIVE
            else if ($gateShift->queue_status !== GateShift::QUEUE_STATUS_WAITING && $gateShift->status === GateShift::STATUS_ACTIVE) {
                // Cập nhật queue_status thành COMPLETED
                $gateShift->update([
                    'queue_status' => GateShift::QUEUE_STATUS_COMPLETED,
                    'updated_by' => Auth::user()->username
                ]);

                // Xóa tất cả gate_staff_shift có gate_shift_id tương ứng và status = WAITING
                GateStaffShift::where('gate_shift_id', $gateShiftId)
                    ->where('status', GateStaffShift::STATUS_WAITING)
                    ->delete();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Xóa ca làm việc thành công'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function createDefaultGateAssignment(Request $request)
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
                'push_notification' => 'nullable|boolean',
                'shift_info' => 'required|array',
                'shift_info.*.gate_id' => 'required|exists:gate,id',
                'shift_info.*.staff_ids' => 'required|array',
                'shift_info.*.staff_ids.*' => 'exists:staff,id',
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

            // Tối ưu: Lấy tất cả dữ liệu cần thiết trong một lần query
            $allStaffIds = collect($request->shift_info)->pluck('staff_ids')->flatten()->unique()->values();
            $allGateIds = collect($request->shift_info)->pluck('gate_id')->unique()->values();

            // Tối ưu: Gom các query kiểm tra vào một mảng
            $checks = [
                // Kiểm tra Gate status
                Gate::whereIn('id', $allGateIds)
                    ->where('status', '!=', 'ACTIVE')
                    ->select('id', 'name')
                    ->get(),

                // Kiểm tra Staff status
                Staff::whereIn('id', $allStaffIds)
                    ->where('status', '!=', 'ACTIVE')
                    ->select('id', 'name')
                    ->get(),

                // Kiểm tra Staff group
                Staff::whereIn('id', $allStaffIds)
                    ->where('group_id', $request->staff_group_id)
                    ->where('status', 'ACTIVE')
                    ->select('id')
                    ->get(),

                // Kiểm tra existing assignments
                GateStaffShift::whereDate('date', Carbon::parse($request->date)->startOfDay())
                    ->whereIn('staff_id', $allStaffIds)
                    ->with('staff:id,name,code')
                    ->get()
            ];

            // Kiểm tra trạng thái của các Gate
            $inactiveGates = $checks[0];
            
            if ($inactiveGates->isNotEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Các vị trí sau đang không hoạt động: ' . 
                        $inactiveGates->pluck('name')->join(', ')
                ], 422);
            }

            // Kiểm tra trạng thái của các Staff
            $inactiveStaffs = $checks[1];

            if ($inactiveStaffs->isNotEmpty()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Các nhân viên sau đang không hoạt động: ' . 
                        $inactiveStaffs->pluck('name')->join(', ')
                ], 422);
            }

            // Kiểm tra xem nhân viên có thuộc nhóm không
            $staffCount = $checks[2]->count();

            if ($staffCount !== count($allStaffIds)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Một số nhân viên không thuộc nhóm này'
                ], 422);
            }

            // Kiểm tra xem có nhân viên nào đã được phân ca trong ngày chưa
            $existingAssignments = $checks[3];

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
                $gateStaffShiftData = [];
                $gateShifts = [];
                
                // Tối ưu: Lấy tất cả gate shifts hiện có trong một query
                $existingGateShifts = GateShift::whereDate('date', $request->date)
                    ->whereIn('gate_id', $allGateIds)
                    ->where('staff_group_id', $request->staff_group_id)
                    ->where('status', GateShift::STATUS_ACTIVE)
                    ->get()
                    ->keyBy('gate_id');

                // Tối ưu: Lấy max index cho mỗi gate trong một query
                $maxIndexes = GateStaffShift::whereDate('date', $request->date)
                    ->whereHas('gateShift', function($query) use ($request, $allGateIds) {
                        $query->whereIn('gate_id', $allGateIds)
                            ->where('staff_group_id', $request->staff_group_id);
                    })
                    ->select('gate_id', DB::raw('MAX(`index`) as max_index'))
                    ->groupBy('gate_id')
                    ->get()
                    ->keyBy('gate_id');

                foreach ($request->shift_info as $shiftInfo) {
                    if (empty($shiftInfo['staff_ids'])) continue;

                    $gateId = $shiftInfo['gate_id'];
                    $maxIndex = $maxIndexes->get($gateId)->max_index ?? 0;

                    // Sử dụng gate shift có sẵn hoặc tạo mới
                    $gateShift = $existingGateShifts->get($gateId);
                    if (!$gateShift) {
                        $gateShift = new GateShift([
                            'staff_group_id' => $request->staff_group_id,
                            'gate_id' => $gateId,
                            'date' => $request->date,
                            'current_index' => $maxIndex,
                            'status' => 'ACTIVE'
                        ]);
                        $gateShift->save();
                    }

                    // Tối ưu: Chuẩn bị dữ liệu để insert hàng loạt
                    foreach ($shiftInfo['staff_ids'] as $staffId) {
                        $maxIndex++;
                        $gateStaffShiftData[] = [
                            'gate_shift_id' => $gateShift->id,
                            'gate_id' => $gateId,
                            'staff_id' => $staffId,
                            'date' => $request->date,
                            'index' => $maxIndex,
                            'status' => GateStaffShift::STATUS_WAITING,
                            'created_at' => now(),
                            'updated_at' => now()
                        ];
                    }
                }

                // Tối ưu: Insert hàng loạt thay vì insert từng record
                $chunks = array_chunk($gateStaffShiftData, 500);
                foreach ($chunks as $chunk) {
                    GateStaffShift::insert($chunk);
                }

                // Gửi thông báo nếu được yêu cầu
                if ($request->push_notification && !empty($gateStaffShiftData)) {
                    try {
                        $this->notificationService->pushShiftNotiForMultiple(collect($gateStaffShiftData)->pluck('id')->toArray());
                    } catch (Exception $e) {
                        Log::error('Error pushing shift notification: ' . $e->getMessage());
                    }
                }

                DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Tạo ca làm việc thành công'
                ]);

            } catch (Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tạo ca làm việc thất bại',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 