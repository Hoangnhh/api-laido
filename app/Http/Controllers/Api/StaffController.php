<?php

namespace App\Http\Controllers\Api;

use App\Enums\SystemConfigKey;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\ApiResponse;
use App\Models\Staff;
use App\Models\GateStaffShift;
use App\Models\GateShift;
use Carbon\Carbon;
use Illuminate\Http\Request;
use App\Models\CheckedTicket;
use App\Models\Payment;
use App\Models\SystemConfig;
use App\Services\NotificationService;

class StaffController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    use ApiResponse;

    public function getInfo(Request $request)
    {
        try {
            $userId = $request->user_id;
            
            $staff = Staff::with('group')
                ->where('id', $userId)
                ->where('status', Staff::STATUS_ACTIVE)
                ->first();

            if (!$staff) {
                return $this->errorResponse('Không tìm thấy thông tin nhân viên', 404);
            }

            // Lấy ca làm việc hiện tại hoặc ca tiếp theo của nhân viên
            $shift = GateStaffShift::join('gate_shift', 'gate_staff_shift.gate_shift_id', '=', 'gate_shift.id')
                ->where('gate_staff_shift.staff_id', $userId)
                ->whereIn('gate_staff_shift.status', [GateStaffShift::STATUS_WAITING, GateStaffShift::STATUS_CHECKIN])
                ->where('gate_shift.status', GateShift::STATUS_ACTIVE)
                ->orderBy('gate_shift.date', 'asc')
                ->with(['gateShift.gate:id,name', 'gateShift:id,date,gate_id'])
                ->select('gate_staff_shift.*')
                ->get();

            // Tìm ca làm việc phù hợp
            $currentShift = null;
            $lastCheckoutShift = null;

            foreach ($shift as $s) {
                if ($s->status !== GateStaffShift::STATUS_CHECKOUT) {
                    $currentShift = $s;
                    break;
                } else {
                    $lastCheckoutShift = $s; // Lưu lại ca checkout gần nhất
                }
            }

            // Nếu không tìm thấy ca nào đang hoạt động, sử dụng ca checkout gần nhất
            if (!$currentShift && $lastCheckoutShift) {
                $currentShift = $lastCheckoutShift;
            }

            $systemConfigs = SystemConfig::getConfigs(
                [
                    SystemConfigKey::ENABLE_CHECKIN_BY_INDEX, 
                    SystemConfigKey::ENABLE_CHECKIN_ALL_GATE,
                    SystemConfigKey::CHECKIN_TICKET_RANGE_MINUTE,
                ]);
           
            $checkinByIndex = $systemConfigs[SystemConfigKey::ENABLE_CHECKIN_BY_INDEX->value] ?? '0';
            $checkinAllGate = $systemConfigs[SystemConfigKey::ENABLE_CHECKIN_ALL_GATE->value] ?? '0';
            $checkinTicketRangeMinute = $systemConfigs[SystemConfigKey::CHECKIN_TICKET_RANGE_MINUTE->value] ?? '0';
            // Tính số người đứng trước trong hàng đợi
            $queuePosition = 0;
            $queueMessage = '';
            if ($checkinByIndex == '1' && $currentShift && $currentShift->status === GateStaffShift::STATUS_WAITING) {
                // Lấy gate_id và date từ gateShift hiện tại
                $gateId = $currentShift->gateShift->gate_id;
                $shiftDate = $currentShift->gateShift->date;

                // Đếm tất cả các gate_staff_shift có cùng gate_id, cùng ngày và index nhỏ hơn
                $queuePosition = GateStaffShift::join('gate_shift', 'gate_staff_shift.gate_shift_id', '=', 'gate_shift.id')
                    ->where('gate_shift.gate_id', $gateId)
                    ->where('gate_staff_shift.status', GateStaffShift::STATUS_WAITING)
                    ->where(function($query) use ($shiftDate, $currentShift) {
                        $query->whereDate('gate_shift.date', '<', $shiftDate)
                            ->orWhere(function($q) use ($shiftDate, $currentShift) {
                                $q->whereDate('gate_shift.date', $shiftDate)
                                    ->where('gate_staff_shift.id', '<', $currentShift->id);
                            });
                    })
                    ->count();
                if($queuePosition > 0){
                    $queueMessage = "Còn " . $queuePosition . " người đứng trước bạn";
                }else if($queuePosition == 0){
                    $queueMessage = "Đã tới lượt bạn checkin";
                }
            }else{
                $queuePosition = -2;
                if($checkinAllGate == '1'){
                    $queueMessage = "Vui lòng tới cổng để checkin";
                }else{
                    $queueMessage = "Vui lòng tới " . $currentShift->gateShift->gate->name . " để checkin";
                }
            }

            return $this->successResponse([
                'staff' => [
                    'id' => $staff->id,
                    'phone' => $staff->phone,
                    'name' => $staff->name,
                    'code' => $staff->code,
                    'username' => $staff->username,
                    'bank_account' => $staff->bank_account,
                    'bank_name' => $staff->bank_name,
                    'vehicle_size' => $staff->vehical_size,
                    'vehicle_type' => $staff->vehicle_type == 1 ? 'Đò' : 'Xuồng',
                    'age' => Carbon::parse($staff->birthdate)->age,
                    'birthdate' => Carbon::parse($staff->birthdate)->format('d/m/Y'),
                    'card_id' => $staff->card_id,
                    'address' => $staff->address,
                    'shift' => $currentShift ? [
                        'id' => $currentShift->id,
                        'index' => $currentShift->index,
                        'queue_position' => $queuePosition + 1, // Thêm 1 vào vị trí để hiển thị số thứ tự
                        'queue_message' => $queueMessage,
                        'checkin_expired_at' => $currentShift->status == GateStaffShift::STATUS_WAITING && $currentShift->checkin_at ? Carbon::parse($currentShift->checkin_at)->addMinutes((int)$checkinTicketRangeMinute)->format('H:i:s d/m/Y ') : null,
                        'gate' => $currentShift->gateShift->gate->name,
                        'date' => $currentShift->gateShift->date,
                        'status' => $currentShift->status,
                        'checkin_at' => $currentShift->checkin_at,
                    ] : null,
                    'avatar' => $staff->avatar_url,
                    'group' => [
                        'id' => $staff->group->id,
                        'name' => $staff->group->name
                    ]
                ]
            ], 'Lấy thông tin nhân viên thành công');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function getCheckedTickets(Request $request)
    {
        try {
            $userId = $request->user_id;
            
            // Xử lý fromDate và toDate theo múi giờ GMT+7
            $fromDate = $request->fromDate 
                ? Carbon::parse($request->fromDate)->setTimezone('Asia/Ho_Chi_Minh')->startOfDay()
                : Carbon::now('Asia/Ho_Chi_Minh')->startOfDay();
            
            $toDate = $request->toDate 
                ? Carbon::parse($request->toDate)->setTimezone('Asia/Ho_Chi_Minh')->endOfDay()
                : Carbon::now('Asia/Ho_Chi_Minh')->endOfDay();

            $tickets = CheckedTicket::where('staff_id', $userId)
                ->distinct('code')
                ->whereBetween('checkin_at', [$fromDate, $toDate])
                ->orderByRaw('CASE 
                    WHEN status = ? THEN checkout_at 
                    ELSE checkin_at 
                    END DESC', [CheckedTicket::STATUS_CHECKOUT])
                ->get()
                ->map(function ($ticket) {
                    return [
                        'id' => $ticket->id,
                        'code' => $ticket->code,
                        'name' => $ticket->name,
                        'status' => $ticket->status,
                        'checkin_at' => Carbon::parse($ticket->checkin_at)
                            ->setTimezone('Asia/Ho_Chi_Minh')
                            ->format('H:i:s d/m/Y'),
                        'checkout_at' => $ticket->checkout_at 
                            ? Carbon::parse($ticket->checkout_at)
                                ->setTimezone('Asia/Ho_Chi_Minh')
                                ->format('H:i:s d/m/Y')
                            : null,
                        'price' => $ticket->price,
                        'commission' => $ticket->commission,
                        'is_checkout_with_other' => $ticket->is_checkout_with_other,
                        'paid' => $ticket->paid
                    ];
                });
            // Ẩn 4 số giữa của code vé
            $tickets = $tickets->map(function($ticket) {
                $code = $ticket['code'];
                if (strlen($code) == 10) {
                    $ticket['code'] = substr($code, 0, 3) . '****' . substr($code, 7);
                }
                return $ticket;
            });

            return $this->successResponse([
                'tickets' => $tickets,
                'total' => $tickets->count()
            ], 'Lấy danh sách vé thành công');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function getDashboardInfo(Request $request)
    {
        try {
            $userId = $request->user_id;
            $fromDate = $request->fromDate ?? now()->toDateString() . ' 00:00:00';
            $toDate = $request->toDate ?? $fromDate . ' 23:59:59';

            $tickets = CheckedTicket::where('staff_id', $userId)
                ->whereDate('checkin_at', '>=', $fromDate)
                ->whereDate('checkin_at', '<=', $toDate)
                ->get();


            // Tổng số vé
            $totalTickets = $tickets->unique('code')->count();

            // Tổng tiền commission
            $totalCommission = $tickets->sum('commission');

            // Tổng tiền đã thanh toán
            $totalPaid = $tickets->where('paid', 1)->sum('commission');

            // Tổng tiền còn lại chưa thanh toán
            $totalRemaining = $totalCommission - $totalPaid;

            // Lấy danh sách thanh toán trong khoảng thời gian
            $payments = Payment::where('staff_id', $userId)
                ->whereDate('date', '>=', $fromDate)
                ->whereDate('date', '<=', $toDate)
                ->where('status', Payment::STATUS_ACTIVE)
                ->orderBy('id', 'desc')
                ->get();

            return $this->successResponse([
                'total_tickets' => $totalTickets,
                'total_commission' => $totalCommission,
                'total_paid' => $totalPaid,
                'total_remaining' => $totalRemaining,
                'payments' => $payments->toArray()
            ], 'Lấy thông tin dashboard thành công');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function updateFcmToken(Request $request)
    {
        try {
            $request->validate([
                'user_id' => 'required|exists:staff,id',
                'token' => 'required|string'
            ]);

            $staff = Staff::where('id', $request->user_id)
                ->where('status', Staff::STATUS_ACTIVE)
                ->first();

            if (!$staff) {
                return $this->errorResponse('Không tìm thấy thông tin nhân viên', 404);
            }

            $staff->update([
                'fcm_token' => $request->token
            ]);

            return $this->successResponse(
                ['fcm_token' => $staff->token],
                'Cập nhật FCM token thành công'
            );

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function getNotification(Request $request)
    {
        try {
            $request->validate([
                'per_page' => 'required|integer',
                'page' => 'required|integer'
            ]);

            $staffId = $request->user_id;
            $perPage = $request->per_page;
            $page = $request->page;

            $notifications = $this->notificationService->getNotification($staffId, $perPage, $page);

            return $this->successResponse($notifications['data'] ?? [], 'Lấy danh sách thông báo thành công');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function readNotification(Request $request)
    {
        try {
            $this->notificationService->readNotification($request->notification_id);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function readAllNotification(Request $request)
    {
        try {
            $this->notificationService->readAllNotification($request->user_id);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function getShiftReport(Request $request)
    {
        try {
            $userId = $request->user_id;
            $fromDate = $request->from_date ?? now()->toDateString();
            $toDate = $request->to_date ?? $fromDate;

            $shifts = GateStaffShift::with(['gate', 'checkedTickets'])
                ->whereHas('gateShift', function($query) {
                    $query->where('status', GateShift::STATUS_ACTIVE);
                })
                ->where('staff_id', $userId)
                ->whereDate('date', '>=', $fromDate)
                ->whereDate('date', '<=', $toDate)
                ->orderBy('date', 'desc')
                ->get()
                ->map(function ($shift) {
                    return [
                        'id' => $shift->id,
                        'staff_id' => $shift->staff_id,
                        'gate_shift_id' => $shift->gate_shift_id,
                        'index' => $shift->index,
                        'status' => $shift->status,
                        'gate_name' => $shift->gate->name,
                        'date' => Carbon::parse($shift->gateShift->date)->format('d/m/Y'),
                        'checked_tickets' => $shift->checked_ticket_num,
                        'total_commission' => $shift->checkedTickets->sum('commission'),
                        'checkin_at' => $shift->checkin_at ? Carbon::parse($shift->checkin_at)->format('d/m/Y H:i') : null,
                        'checkout_at' => $shift->checkout_at ? Carbon::parse($shift->checkout_at)->format('d/m/Y H:i') : null,
                        'created_at' => Carbon::parse($shift->created_at)->format('d/m/Y H:i'),
                        'updated_at' => Carbon::parse($shift->updated_at)->format('d/m/Y H:i')
                    ];
                });

            return $this->successResponse([
                'shifts' => $shifts,
                'total' => $shifts->count()
            ], 'Lấy danh sách ca làm việc thành công');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Thay đổi mật khẩu cho nhân viên
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function changePassword(Request $request)
    {
        try {
            // Validate đầu vào
            $request->validate([
                'old_password' => 'required|string',
                'new_password' => 'required|string',
                'confirm_password' => 'required|string'
            ]);

            // Lấy thông tin nhân viên
            $staff = Staff::where('id', $request->user_id)
                ->where('status', Staff::STATUS_ACTIVE)
                ->first();

            if (!$staff) {
                return $this->errorResponse('Không tìm thấy thông tin nhân viên', 404);
            }

            // Thực hiện thay đổi mật khẩu
            $result = $staff->changePassword(
                $request->old_password,
                $request->new_password,
                $request->confirm_password
            );

            if (!$result['success']) {
                return $this->errorResponse($result['message'], 200);
            }

            // Gửi thông báo cho nhân viên
            $staff->sendNotification(
                'Thay đổi mật khẩu',
                'Mật khẩu của bạn đã được thay đổi thành công',
                [
                    'type' => 'CHANGE_PASSWORD',
                    'time' => now()->format('Y-m-d H:i:s')
                ]
            );

            return $this->successResponse(
                null,
                $result['message']
            );

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse($e->errors(), 422);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    
    

    
} 