<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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

class TicketController extends Controller
{
    use ApiResponse;

    protected $ticketService;
    private $commission_configs = [
        "Vé người lớn" => 70000,
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
            'staff_id' => 'required|exists:staffs,id'
        ]);

        if ($validator->fails()) {
            return $this->errorResponse($validator->errors()->first(), 422);
        }

        try {
            // Kiểm tra nhân viên có đang trong ca active và đã checkin chưa
            $activeAssignment = GateStaffShift::where('staff_id', $request->staff_id)
                ->where('status', GateStaffShift::STATUS_CHECKIN)
                ->whereHas('gateShift', function($query) {
                    $query->where('status', GateShift::STATUS_ACTIVE)
                        ->where('queue_status', GateShift::QUEUE_STATUS_RUNNING);
                })
                ->with(['gateShift', 'gate', 'staff'])
                ->first();

            if (!$activeAssignment) {
                return $this->errorResponse('Nhân viên chưa checkin hoặc không trong ca trực', 403);
            }

            // Kiểm tra vé trong bảng checked_ticket
            $existingTicket = CheckedTicket::where('code', $request->code)
                ->whereNull('checkout_at')
                ->first();

            // Nếu chưa có record hoặc đã checkout thì là checkin
            if (!$existingTicket) {
                // Kiểm tra giới hạn số vé theo vehical_size
                $enableLimitByVehicalSize = SystemConfig::getConfig('ENABLE_LIMIT_BY_VEHICAL_SIZE');
                
                if ($enableLimitByVehicalSize == 1) {
                    $currentTicketCount = $activeAssignment->checked_ticket_num;
                    $vehicalSize = $activeAssignment->staff->vehical_size;
                    
                    if ($currentTicketCount >= $vehicalSize) {
                        return $this->errorResponse(
                            "Giới hạn một ca chỉ được phép chở {$vehicalSize} Người. Không thể checkin vé",
                            400
                        );
                    }
                }

                // Gọi service để kiểm tra vé
                $result = $this->ticketService->useTicket($request->code);

                if (!$result['success']) {
                    return $this->errorResponse($result['message'], 400);
                }

                // Tạo bản ghi checked_ticket cho checkin
                $ticketData = $result['data']['ticket'];
                CheckedTicket::create([
                    'code' => $ticketData['code'],
                    'name' => $ticketData['service_name'],
                    'status' => CheckedTicket::STATUS_CHECKIN,
                    'date' => Carbon::now(),
                    'checkin_at' => Carbon::now(),
                    'price' => $ticketData['price'],
                    'commission' => 0, // Chưa tính commission khi checkin
                    'staff_id' => $request->staff_id,
                    'shift_gate_staff_id' => $activeAssignment->id,
                    'paid' => false
                ]);

                return $this->successResponse(
                    array_merge($result['data']['ticket'], [
                        'gate_name' => $activeAssignment->gate->name
                    ]),
                    'Checkin thành công'
                );

            } else { // Đã có record và chưa checkout thì là checkout
                // Tính commission
                $commission = $this->commission_configs[$existingTicket->name] 
                    ?? $this->commission_configs['default'];

                // Cập nhật thông tin checkout và commission
                $existingTicket->update([
                    'status' => CheckedTicket::STATUS_CHECKOUT,
                    'checkout_at' => Carbon::now(),
                    'commission' => $commission
                ]);

                // Tăng số lượng vé đã check
                $activeAssignment->increment('checked_ticket_num');

                return $this->successResponse([
                    'code' => $existingTicket->code,
                    'name' => $existingTicket->name,
                    'checkin_at' => $existingTicket->checkin_at->format('H:i:s'),
                    'checkout_at' => Carbon::now()->format('H:i:s'),
                    'commission' => $commission,
                    'gate_name' => $activeAssignment->gate->name
                ], 'Checkout thành công');
            }

        } catch (\Exception $e) {
            return $this->errorResponse('Có lỗi xảy ra: ' . $e->getMessage(), 500);
        }
    }
} 