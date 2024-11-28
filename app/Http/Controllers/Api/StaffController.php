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
                ->whereIn('gate_shift.queue_status', [GateShift::QUEUE_STATUS_WAITING, GateShift::QUEUE_STATUS_RUNNING])
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
                    'vehicle_size' => $staff->vehical_size,
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
                    'revenue' => "5000000",
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
            $fromDate = $request->fromDate ?? now()->toDateString();
            $toDate = $request->toDate ?? $fromDate;

            $tickets = CheckedTicket::where('staff_id', $userId)
                ->whereDate('date', '>=', $fromDate)
                ->whereDate('date', '<=', $toDate)
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
                        'checkin_at' => $ticket->checkin_at,
                        'checkout_at' => $ticket->checkout_at,
                        'price' => $ticket->price,
                        'commission' => $ticket->commission,
                        'is_checkout_with_other' => $ticket->is_checkout_with_other,
                        'paid' => $ticket->paid
                    ];
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
            $fromDate = $request->fromDate ?? now()->toDateString();
            $toDate = $request->toDate ?? $fromDate;

            $tickets = CheckedTicket::where('staff_id', $userId)
                ->whereDate('date', '>=', $fromDate)
                ->whereDate('date', '<=', $toDate)
                ->get();


            // Tổng số vé
            $totalTickets = $tickets->count();

            // Tổng tiền commission
            $totalCommission = $tickets->sum('commission');

            // Tổng tiền đã thanh toán
            $totalPaid = $tickets->where('paid', 1)->sum('commission');

            // Tổng tiền còn lại chưa thanh toán
            $totalRemaining = $totalCommission - $totalPaid;

            return $this->successResponse([
                'total_tickets' => $totalTickets,
                'total_commission' => $totalCommission,
                'total_paid' => $totalPaid,
                'total_remaining' => $totalRemaining
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

            return $this->successResponse($notifications->data ?? [], 'Lấy danh sách thông báo thành công');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    
} 