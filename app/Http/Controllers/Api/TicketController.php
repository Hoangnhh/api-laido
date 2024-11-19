<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\Api\Traits\ApiResponse;
use App\Models\Staff;
use App\Models\GateStaffShift;
use App\Models\GateShift;
use App\Models\CheckedTicket;
use App\Services\TicketService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\SystemConfig;
use App\Enums\SystemConfigKey;
class TicketController extends Controller
{
    use ApiResponse;

    protected $ticketService;
    private $commission_configs = [
        "ve nguoi lon" => 70000,
        "default" => 70000
    ];

    public function __construct(TicketService $ticketService)
    {
        $this->ticketService = $ticketService;
    }

    /**
     * Sử dụng vé
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function useTicket(Request $request)
    {
        // Validate đầu vào
        $validator = Validator::make($request->all(), [
            'code' => 'required|string',
        ]);
        if ($validator->fails()) {
            return $this->errorResponse($validator->errors()->first());
        }
        $staffId = $request->user_id;

        try {
            // Kiểm tra nhân viên có đang trong ca active và đã checkin chưa
            $activeAssignment = GateStaffShift::where('staff_id', $staffId)
                ->where('status', GateStaffShift::STATUS_CHECKIN)
                ->with(['gateShift', 'gate', 'staff'])
                ->first();

            if (!$activeAssignment) {
                return $this->errorResponse('Nhân viên chưa checkin hoặc không trong ca trực');
            }

            // Kiểm tra vé trong bảng checked_ticket
            $existingTicket = CheckedTicket::where('code', $request->code)->first();

            // Nếu chưa có record hoặc đã checkout thì là checkin
            if (!$existingTicket) {
                // Kiểm tra giới hạn số vé theo vehical_size
                $enableLimitByVehicalSize = SystemConfig::getConfig(SystemConfigKey::ENABLE_LIMIT_BY_VEHICAL_SIZE->value);
                
                if ($enableLimitByVehicalSize == 1) {
                    $currentTicketCount = $activeAssignment->checked_ticket_num;
                    $vehicalSize = $activeAssignment->staff->vehical_size;
                    
                    if ($currentTicketCount >= $vehicalSize) {
                        return $this->errorResponse(
                            "Không thể checkin vé! Bạn chỉ được phép chở {$vehicalSize} Người mỗi ca"
                        );
                    }
                }

                // Gọi service để kiểm tra vé
                $result = $this->ticketService->useTicket($request->code);

                if (!$result['success']) {
                    return $this->errorResponse($result['message']);
                }
                // Thực hiện các thao tác trong transaction
                DB::beginTransaction();
                try {
                    // Tăng số lượng vé đã check
                    $activeAssignment->increment('checked_ticket_num');

                    // Tạo bản ghi checked_ticket cho checkin
                    $ticketData = $result['data']['ticket'];
                    $createdCheckedTicket = CheckedTicket::create([
                        'code' => $ticketData['code'],
                        'name' => $ticketData['service_name'], 
                        'status' => CheckedTicket::STATUS_CHECKIN,
                        'date' => Carbon::now(),
                        'checkin_at' => Carbon::now(),
                        'price' => $ticketData['price'],
                        'commission' => 0, // Chưa tính commission khi checkin
                        'staff_id' => $staffId,
                        'shift_gate_staff_id' => $activeAssignment->id,
                        'paid' => false
                    ]);

                    DB::commit();
                } catch (\Exception $e) {
                    DB::rollback();
                    throw $e;
                }

                return $this->successResponse($createdCheckedTicket->toArray(),
                    'Checkin thành công'
                );

            } else if($existingTicket->status == CheckedTicket::STATUS_CHECKIN) { // Đã có record và chưa checkout thì là checkout
                $checkoutDelayMinute = SystemConfig::getConfig(SystemConfigKey::CHECKOUT_DELAY_MINUTE->value);
                // Tính số phút từ lúc checkin đến hiện tại, đảm bảo luôn là số dương
                $minutesSinceCheckin = abs(Carbon::now()->diffInMinutes($existingTicket->checkin_at));
                if ($minutesSinceCheckin < $checkoutDelayMinute) {
                    return $this->errorResponse(
                        "Chưa đủ thời gian để checkout. Vui lòng đợi thêm " . 
                        round($checkoutDelayMinute - $minutesSinceCheckin) . 
                        " phút nữa",
                    );
                }
                
                // Tính commission
                $commission = $this->commission_configs[$existingTicket->name]
                    ?? $this->commission_configs['default'];

                // Cập nhật thông tin checkout và commission
                $existingTicket->update([
                    'status' => CheckedTicket::STATUS_CHECKOUT,
                    'checkout_at' => Carbon::now(),
                    'commission' => $commission
                ]);

                return $this->successResponse($existingTicket->toArray(), 'Checkout thành công');
            } else {
                return $this->errorResponse('Vé đã được sử dụng');
            }

        } catch (\Exception $e) {
            return $this->errorResponse('Có lỗi xảy ra: ' . $e->getMessage(), 500);
        }
    }
} 