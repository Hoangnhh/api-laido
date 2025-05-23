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
use App\Models\ActionLog;
use App\Models\Ticket;
class TicketController extends Controller
{
    use ApiResponse;

    protected $ticketService;
    private $commission_configs = [
        "phi_thang_canh_ve_do" => 70000,
        "phi_thang_canh_uu_tien_ve_do" => 70000,
        've_do_tuyen_huong_tich' => 70000,
        've_do_tuyen_huong_tich_tre_em' => 42000,
        've_do_tuyen_tuyet_son' => 55000,
        've_do_tuyen_long_van' => 55000,
        've_do_tuyen_tuyet_son_tre_em' => 32000,
        've_do_tuyen_long_van_tre_em' => 32000,
        "default" => 32000
    ];

    private $ignore_checkin_time = [
        "ve_do_tuyen_long_van",
        've_do_tuyen_long_van_tre_em',
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
            
            // Kiểm tra vé trong bảng checked_ticket
            $existingTicket = CheckedTicket::where('code', $request->code)->first();
            $systemConfigs = SystemConfig::getConfigs(
                [
                    SystemConfigKey::ENABLE_LIMIT_BY_VEHICAL_SIZE->value, 
                    SystemConfigKey::CHECKIN_TICKET_RANGE_MINUTE->value,
                    SystemConfigKey::ENABLE_CHECKOUT_WITH_OTHER->value,
                    SystemConfigKey::CHECKOUT_DELAY_MINUTE->value
                ]
            );

            // Nếu chưa có record hoặc đã checkout thì là checkin
            if (!$existingTicket) {
                // Kiểm tra nhân viên có đang trong ca active và đã checkin chưa
                $activeAssignment = GateStaffShift::where('staff_id', $staffId)
                    ->where('status', GateStaffShift::STATUS_CHECKIN)
                    ->with(['gateShift', 'gate', 'staff'])
                    ->first();

                if (!$activeAssignment) {
                    return $this->errorResponse('Nhân viên chưa checkin hoặc không trong ca trực');
                }

                // Kiểm tra giới hạn số vé theo vehical_size
                if ($systemConfigs[SystemConfigKey::ENABLE_LIMIT_BY_VEHICAL_SIZE->value] == 1) {
                    $currentTicketCount = $activeAssignment->checked_ticket_num;
                    $vehicalSize = $activeAssignment->staff->vehical_size;
                    
                    if ($currentTicketCount >= $vehicalSize) {
                        return $this->errorResponse(
                            "Không thể checkin vé! Bạn chỉ được phép chở {$vehicalSize} Người mỗi ca"
                        );
                    }
                }

                // Kiểm tra vé có tồn tại trong bảng ticket không
                $syncTicket = Ticket::where('code', $request->code)->first();

                if (!$syncTicket) {
                    return $this->errorResponse('Vé không tồn tại');
                }

                $ticketData = $syncTicket->toArray();
                if($ticketData['status'] == Ticket::STATUS_USED) {
                    return $this->errorResponse('Vé đã được sử dụng');
                }
                if($ticketData['expired_date'] < Carbon::now()) {
                    return $this->errorResponse('Vé đã hết hạn');
                }
                if($ticketData['issued_date'] > Carbon::now()) {
                    return $this->errorResponse('Vé chưa được sử dụng theo hạn quy định');
                }

                // kiểm tra thời gian checkin vé
                $checkinTicketRangeTime = $systemConfigs[SystemConfigKey::CHECKIN_TICKET_RANGE_MINUTE->value];
                if($checkinTicketRangeTime > 0 && !$this->isIgnoreCheckinTime($ticketData['service_name'])) {
                    $timeDiff = abs(Carbon::now()->diffInMinutes($activeAssignment->checkin_at));
                    if ($timeDiff > $checkinTicketRangeTime) {
                        return $this->errorResponse("Quá thời gian cho phép quét vé, Chỉ được phép quét vé trong ({$checkinTicketRangeTime} phút)");
                    }
                }

                // Lấy commission từ config theo tên dịch vụ đã xử lý
                $commission = $this->calculateCommission($ticketData['service_name']);

                // Thực hiện các thao tác trong transaction
                DB::beginTransaction();
                try {
                    // Tăng số lượng vé đã check
                    $activeAssignment->increment('checked_ticket_num');

                    // Tạo bản ghi checked_ticket cho checkin
                    $createdCheckedTicket = CheckedTicket::create([
                        'code' => $ticketData['code'],
                        'name' => $ticketData['service_name'], 
                        'issue_date' => $ticketData['issued_date'],
                        'expired_date' => $ticketData['expired_date'],
                        'status' => CheckedTicket::STATUS_CHECKIN,
                        'date' => Carbon::now(),
                        'checkin_gate_id' => $activeAssignment->checkin_gate_id,
                        'checkin_at' => Carbon::now(),
                        'checkin_by' => $request->username,
                        'price' => $ticketData['price'],
                        'commission' => $commission,
                        'staff_id' => $staffId,
                        'gate_staff_shift_id' => $activeAssignment->id,
                        'paid' => false
                    ]);
                    
                    if($syncTicket){
                        $syncTicket->update([
                            'status' => Ticket::STATUS_USED
                        ]);
                    }

                    DB::commit();
                } catch (\Exception $e) {
                    DB::rollback();
                    throw $e;
                }

                return $this->successResponse($createdCheckedTicket->toArray(),
                    'Checkin thành công'
                );

            } else if($existingTicket->status == CheckedTicket::STATUS_CHECKIN) { // Đã có record và chưa checkout thì là checkout
                $checkoutDelayMinute = $systemConfigs[SystemConfigKey::CHECKOUT_DELAY_MINUTE->value];
                // Tính số phút và giây từ lúc checkin đến hiện tại, đảm bảo luôn là số dương
                $secondsSinceCheckin = abs(Carbon::now()->diffInSeconds($existingTicket->checkin_at));
                $minutesSinceCheckin = floor($secondsSinceCheckin / 60);
                $remainingSeconds = $secondsSinceCheckin % 60;
                
                if ($minutesSinceCheckin < $checkoutDelayMinute) {
                    $remainingMinutes = $checkoutDelayMinute - $minutesSinceCheckin - 1;
                    $remainingSecondsDisplay = 60 - $remainingSeconds;
                    
                    return $this->errorResponse(
                        "Chưa đủ thời gian để checkout. Vui lòng đợi thêm " . 
                        $remainingMinutes . " phút " . 
                        $remainingSecondsDisplay . " giây nữa"
                    );
                }
                
                // Lấy commission từ config theo tên dịch vụ đã xử lý
                $commission = $this->calculateCommission($existingTicket->name);

                // Kiểm tra nhân viên có đang trong ca active và đã checkin chưa
                $activeAssignment = GateStaffShift::where('staff_id', $staffId)
                    ->where('status', GateStaffShift::STATUS_CHECKIN)
                    ->first();
                
                if(!$activeAssignment) {
                    return $this->errorResponse('Nhân viên chưa checkin hoặc không trong ca trực');
                }
                DB::beginTransaction();

                // Cập nhật thông tin checkout cho vé hiện tại
                $existingTicket->update([
                    'status' => CheckedTicket::STATUS_CHECKOUT,
                    'is_checkout_with_other' => $existingTicket->checkin_by != $request->username,
                    'checkout_at' => Carbon::now(),
                    'checkout_by' => $request->username,
                ]);

                // Nếu vé đã thanh toán hoặc người checkout khác người checkin thì tạo vé mới
                if(($existingTicket->paid || $existingTicket->checkin_by != $request->username)) {
                    if($systemConfigs[SystemConfigKey::ENABLE_CHECKOUT_WITH_OTHER->value] == 1 || $existingTicket->checkin_by == $request->username){
                        $createdCheckedTicket = CheckedTicket::create([
                            'code' => $request->code,
                            'name' => $existingTicket->name,
                            'status' => CheckedTicket::STATUS_CHECKOUT,
                            'date' => Carbon::now(),
                            'checkin_at' => $existingTicket->checkin_at,
                            'checkin_by' => $existingTicket->checkin_by,
                            'checkout_at' => Carbon::now(),
                            'checkout_by' => $request->username,
                            'price' => $existingTicket->price,
                            'commission' => $commission,
                            'staff_id' => $staffId,
                            'gate_staff_shift_id' => $activeAssignment->id,
                            'checkin_gate_id' => $activeAssignment->checkin_gate_id,
                            'paid' => false,
                            'is_checkout_with_other' => $existingTicket->checkin_by != $request->username,
                                'is_checkin_with_other' => 1
                        ]);
                    }else{
                        throw new \Exception('Checkout vé không thành công . Vé đã vé được checkin bởi tài khoản ' . $existingTicket->checkin_by);
                    }

                    DB::commit();

                    return $this->successResponse($createdCheckedTicket->toArray(), 'Checkout thành công');
                }
                
                DB::commit();
                

                // Trường hợp checkout bởi chính nhân viên đã checkin và vé chưa thanh toán
                $existingTicket->increment('commission', $commission);
                return $this->successResponse($existingTicket->toArray(), 'Checkout thành công');

                
            } else {
                return $this->errorResponse('Vé đã được sử dụng');
            }

        } catch (\Exception $e) {
            DB::rollback();
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function masterUseTicket(int $staffId, string $code)
    {
        try {
            DB::beginTransaction();
            
            $staff = Staff::find($staffId);
            if(!$staff){
                return $this->errorResponse('Nhân viên không tồn tại');
            }

            // Kiểm tra vé trong bảng checked_ticket
            $existingTicket = CheckedTicket::where('code', $code)->first();

            // Nếu chưa có record hoặc đã checkout thì là checkin
            if (!$existingTicket || $existingTicket->status == CheckedTicket::STATUS_CHECKOUT) {
                // Kiểm tra vé có tồn tại trong bảng ticket không
                $syncTicket = Ticket::where('code', $code)->first();

                if (!$syncTicket) {
                    return $this->errorResponse('Vé không tồn tại');
                }

                $ticketData = $syncTicket->toArray();
                if($ticketData['status'] == Ticket::STATUS_USED) {
                    return $this->errorResponse('Vé đã được sử dụng');
                }
                if($ticketData['expired_date'] < Carbon::now()) {
                    return $this->errorResponse('Vé đã hết hạn');
                }
                if($ticketData['issued_date'] > Carbon::now()) {
                    return $this->errorResponse('Vé chưa được sử dụng theo hạn quy định');
                }

                // Tạo checked ticket mới
                $checkedTicket = CheckedTicket::create([
                    'code' => $code,
                    'name' => $syncTicket->service_name,
                    'issue_date' => $syncTicket->issued_date,
                    'expired_date' => $syncTicket->expired_date,
                    'status' => CheckedTicket::STATUS_CHECKOUT,
                    'date' => Carbon::now(),
                    'checkin_at' => Carbon::now(),
                    'checkin_by' => $staff->username,
                    'checkout_at' => Carbon::now(),
                    'checkout_by' => $staff->username,
                    'price' => $syncTicket->price,
                    'commission' => 0,
                    'staff_id' => $staffId,
                    'paid' => false,
                    'is_checkout_with_other' => 0,
                    'is_checkin_with_other' => 0
                ]);

                // Cập nhật trạng thái vé thành đã sử dụng
                $syncTicket->update([
                    'status' => Ticket::STATUS_USED
                ]);

                DB::commit();
                
                $checkedTicket['checkin_time'] = Carbon::parse($checkedTicket->checkin_at)->format('H:i:s');
                $checkedTicket['checkout_time'] = Carbon::parse($checkedTicket->checkout_at)->format('H:i:s');
                return $this->successResponse($checkedTicket, 'Quét vé thành công');
            }

            DB::commit();
            return $this->errorResponse('Vé đã được sử dụng');

        } catch (\Exception $e) {
            DB::rollback();
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Sử dụng vé
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function useTicketInGate(Request $request)
    {
        // Validate đầu vào
        $validator = Validator::make($request->all(), [
            'code' => 'required|string',
            'staff_id' => 'required|integer',
        ]);
        if ($validator->fails()) {
            return $this->errorResponse($validator->errors()->first());
        }
        $staffId = $request->staff_id;
        $isMaster = $request->is_master ?? 0;
        if($isMaster == 1){
            return $this->masterUseTicket($staffId, $request->code);
        }

        $staff = Staff::find($staffId);

        if($staff){
            $request->merge(['username' => $staff->username]);
        }else{
            return $this->errorResponse('Nhân viên không tồn tại');
        }

        try {
            
            // Kiểm tra vé trong bảng checked_ticket
            $existingTicket = CheckedTicket::where('code', $request->code)->first();
            $systemConfigs = SystemConfig::getConfigs(
                [
                    SystemConfigKey::ENABLE_LIMIT_BY_VEHICAL_SIZE->value, 
                    SystemConfigKey::CHECKIN_TICKET_RANGE_MINUTE->value,
                    SystemConfigKey::ENABLE_CHECKOUT_WITH_OTHER->value,
                    SystemConfigKey::CHECKOUT_DELAY_MINUTE->value
                ]
            );

            // Nếu chưa có record hoặc đã checkout thì là checkin
            if (!$existingTicket) {
                // Kiểm tra nhân viên có đang trong ca active và đã checkin chưa
                $activeAssignment = GateStaffShift::where('staff_id', $staffId)
                    ->where('status', GateStaffShift::STATUS_CHECKIN)
                    ->with(['gateShift', 'gate', 'staff'])
                    ->first();

                if (!$activeAssignment) {
                    return $this->errorResponse('Nhân viên chưa checkin hoặc không trong ca trực');
                }

                // Kiểm tra giới hạn số vé theo vehical_size
                if ($systemConfigs[SystemConfigKey::ENABLE_LIMIT_BY_VEHICAL_SIZE->value] == 1) {
                    $currentTicketCount = $activeAssignment->checked_ticket_num;
                    $vehicalSize = $activeAssignment->staff->vehical_size;
                    
                    if ($currentTicketCount >= $vehicalSize) {
                        return $this->errorResponse(
                            "Không thể checkin vé! Bạn chỉ được phép chở {$vehicalSize} Người mỗi ca"
                        );
                    }
                }

                // Kiểm tra vé có tồn tại trong bảng ticket không
                $syncTicket = Ticket::where('code', $request->code)->first();

                if (!$syncTicket) {
                    return $this->errorResponse('Vé không tồn tại');
                }

                $ticketData = $syncTicket->toArray();
                if($ticketData['status'] == Ticket::STATUS_USED) {
                    return $this->errorResponse('Vé đã được sử dụng');
                }
                if($ticketData['expired_date'] < Carbon::now()) {
                    return $this->errorResponse('Vé đã hết hạn');
                }
                if($ticketData['issued_date'] > Carbon::now()) {    
                    return $this->errorResponse('Vé chưa được sử dụng theo hạn quy định');
                }

                // kiểm tra thời gian checkin vé
                $checkinTicketRangeTime = $systemConfigs[SystemConfigKey::CHECKIN_TICKET_RANGE_MINUTE->value];
                if($checkinTicketRangeTime > 0 && !$this->isIgnoreCheckinTime($ticketData['service_name'])) {
                    $timeDiff = abs(Carbon::now('Asia/Ho_Chi_Minh')->diffInMinutes($activeAssignment->checkin_at));
                    if ($timeDiff > $checkinTicketRangeTime) {
                        return $this->errorResponse("Quá thời gian cho phép quét vé, Chỉ được phép quét vé trong ({$checkinTicketRangeTime} phút)");
                    }
                }

                // Lấy commission từ config theo tên dịch vụ đã xử lý
                $commission = $this->calculateCommission($ticketData['service_name']);

                // Thực hiện các thao tác trong transaction
                DB::beginTransaction();
                try {
                    // Tăng số lượng vé đã check
                    $activeAssignment->increment('checked_ticket_num');

                    // Tạo bản ghi checked_ticket cho checkin
                    $createdCheckedTicket = CheckedTicket::create([
                        'code' => $ticketData['code'],
                        'name' => $ticketData['service_name'], 
                        'issue_date' => $ticketData['issued_date'],
                        'expired_date' => $ticketData['expired_date'],
                        'status' => CheckedTicket::STATUS_CHECKIN,
                        'date' => Carbon::now(),
                        'checkin_gate_id' => $activeAssignment->checkin_gate_id,
                        'checkin_at' => Carbon::now(),
                        'checkout_at' => null,
                        'checkin_by' => $request->username,
                        'price' => $ticketData['price'],
                        'commission' => $commission,
                        'staff_id' => $staffId,
                        'gate_staff_shift_id' => $activeAssignment->id,
                        'paid' => false
                    ]);
                    
                    if($syncTicket){
                        $syncTicket->update([
                            'status' => Ticket::STATUS_USED
                        ]);
                    }

                    DB::commit();
                } catch (\Exception $e) {
                    DB::rollback();
                    throw $e;
                }

                $ticketData = $createdCheckedTicket->toArray();
                $ticketData['checkin_time'] = Carbon::now('Asia/Ho_Chi_Minh')->format('H:i:s');
                $ticketData['checkout_time'] = null;
                return $this->successResponse($ticketData,
                    'Quét vé chiều vào thành công'
                );

            } else if($existingTicket->status == CheckedTicket::STATUS_CHECKIN) { // Đã có record và chưa checkout thì là checkout
                $checkoutDelayMinute = $systemConfigs[SystemConfigKey::CHECKOUT_DELAY_MINUTE->value];
                // Tính số phút và giây từ lúc checkin đến hiện tại, đảm bảo luôn là số dương
                $secondsSinceCheckin = abs(Carbon::now('Asia/Ho_Chi_Minh')->diffInSeconds($existingTicket->checkin_at));
                $minutesSinceCheckin = floor($secondsSinceCheckin / 60);
                $remainingSeconds = $secondsSinceCheckin % 60;
                
                if ($minutesSinceCheckin < $checkoutDelayMinute) {
                    $remainingMinutes = $checkoutDelayMinute - $minutesSinceCheckin - 1;
                    $remainingSecondsDisplay = 60 - $remainingSeconds;
                    
                    return $this->errorResponse(
                        "Chưa đủ thời gian để checkout. Vui lòng đợi thêm " . 
                        $remainingMinutes . " phút " . 
                        $remainingSecondsDisplay . " giây nữa"
                    );
                }
                
                // Lấy commission từ config theo tên dịch vụ đã xử lý
                $commission = $this->calculateCommission($existingTicket->name);

                // Kiểm tra nhân viên có đang trong ca active và đã checkin chưa
                $activeAssignment = GateStaffShift::where('staff_id', $staffId)
                    ->where('status', GateStaffShift::STATUS_CHECKIN)
                    ->first();
                
                if(!$activeAssignment) {
                    return $this->errorResponse('Nhân viên chưa checkin hoặc không trong ca trực');
                }
                DB::beginTransaction();

                // Cập nhật thông tin checkout cho vé hiện tại
                $existingTicket->update([
                    'status' => CheckedTicket::STATUS_CHECKOUT,
                    'is_checkout_with_other' => $existingTicket->checkin_by != $request->username,
                    'checkout_at' => Carbon::now('Asia/Ho_Chi_Minh'),
                    'checkout_by' => $request->username,
                ]);

                // Nếu vé đã thanh toán hoặc người checkout khác người checkin thì tạo vé mới
                if(($existingTicket->paid || $existingTicket->checkin_by != $request->username)) {
                    if($systemConfigs[SystemConfigKey::ENABLE_CHECKOUT_WITH_OTHER->value] == 1 || $existingTicket->checkin_by == $request->username){
                        $createdCheckedTicket = CheckedTicket::create([
                            'code' => $request->code,
                            'name' => $existingTicket->name,
                            'status' => CheckedTicket::STATUS_CHECKOUT,
                            'date' => Carbon::now('Asia/Ho_Chi_Minh'),
                            'checkin_at' => $existingTicket->checkin_at,
                            'checkin_by' => $existingTicket->checkin_by,
                            'checkout_at' => Carbon::now('Asia/Ho_Chi_Minh'),
                            'checkout_by' => $request->username,
                            'price' => $existingTicket->price,
                            'commission' => $commission,
                            'staff_id' => $staffId,
                            'gate_staff_shift_id' => $activeAssignment->id,
                            'checkin_gate_id' => $activeAssignment->checkin_gate_id,
                            'paid' => false,
                            'is_checkout_with_other' => $existingTicket->checkin_by != $request->username,
                                'is_checkin_with_other' => 1
                        ]);
                    }else{
                        throw new \Exception('Checkout vé không thành công . Vé đã vé được checkin bởi tài khoản ' . $existingTicket->checkin_by);
                    }

                    DB::commit();

                    $ticketData = $createdCheckedTicket->toArray();
                    $ticketData['checkin_time'] = $existingTicket->checkin_at->format('H:i:s');
                    $ticketData['checkout_time'] = Carbon::now('Asia/Ho_Chi_Minh')->format('H:i:s');
                    return $this->successResponse($ticketData, 'Quét vé chiều ra thành công');
                }
                
                DB::commit();
                

                // Trường hợp checkout bởi chính nhân viên đã checkin và vé chưa thanh toán
                $existingTicket->increment('commission', $commission);
                $ticketData = $existingTicket->toArray();
                $ticketData['checkin_time'] = $existingTicket->checkin_at->format('H:i:s');
                $ticketData['checkout_time'] = Carbon::now('Asia/Ho_Chi_Minh')->format('H:i:s');
                return $this->successResponse($ticketData, 'Quét vé chiều ra thành công');      

                
            } else {
                return $this->errorResponse('Vé đã được sử dụng');
            }

        } catch (\Exception $e) {
            DB::rollback();
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    // Hàm helper để lấy danh sách vé đã check của nhân viên
    public function getCheckedTicketsByStaff(Request $request)
    {
        $staffId = $request->staff_id;
        return CheckedTicket::getTicketsByStaffToday($staffId);
    }

    private function calculateCommission($ticketName) {
        // Xử lý tên dịch vụ để lấy commission
        $serviceName = mb_strtolower($ticketName); // Chuyển về chữ thường
        $serviceName = preg_replace('/[^\p{L}\p{N}\s]/u', '', $serviceName); // Bỏ dấu câu
        $serviceName = preg_replace('/[àáạảãâầấậẩẫăằắặẳẵ]/u', 'a', $serviceName);
        $serviceName = preg_replace('/[èéẹẻẽêềếệểễ]/u', 'e', $serviceName);
        $serviceName = preg_replace('/[ìíịỉĩ]/u', 'i', $serviceName);
        $serviceName = preg_replace('/[òóọỏõôồốộổỗơờớợởỡ]/u', 'o', $serviceName);
        $serviceName = preg_replace('/[ùúụủũưừứựửữ]/u', 'u', $serviceName);
        $serviceName = preg_replace('/[ỳýỵỷỹ]/u', 'y', $serviceName);
        $serviceName = preg_replace('/đ/u', 'd', $serviceName);
        $serviceName = str_replace(['.', ',', '(', ')'], '', $serviceName); // Loại bỏ dấu chấm, dấu phẩy và dấu ngoặc đơn
        $serviceName = str_replace(' ', '_', trim($serviceName)); // Thay khoảng trắng bằng gạch dưới

        $commission = $this->commission_configs[$serviceName]
            ?? $this->commission_configs['default'];
        return $commission/2;
    }
    private function isIgnoreCheckinTime($ticketName) {
        // Xử lý tên dịch vụ để lấy commission
        $serviceName = mb_strtolower($ticketName); // Chuyển về chữ thường
        $serviceName = preg_replace('/[^\p{L}\p{N}\s]/u', '', $serviceName); // Bỏ dấu câu
        $serviceName = preg_replace('/[àáạảãâầấậẩẫăằắặẳẵ]/u', 'a', $serviceName);
        $serviceName = preg_replace('/[èéẹẻẽêềếệểễ]/u', 'e', $serviceName);
        $serviceName = preg_replace('/[ìíịỉĩ]/u', 'i', $serviceName);
        $serviceName = preg_replace('/[òóọỏõôồốộổỗơờớợởỡ]/u', 'o', $serviceName);
        $serviceName = preg_replace('/[ùúụủũưừứựửữ]/u', 'u', $serviceName);
        $serviceName = preg_replace('/[ỳýỵỷỹ]/u', 'y', $serviceName);
        $serviceName = preg_replace('/đ/u', 'd', $serviceName);
        $serviceName = str_replace(['.', ',', '(', ')'], '', $serviceName); // Loại bỏ dấu chấm, dấu phẩy và dấu ngoặc đơn
        $serviceName = str_replace(' ', '_', trim($serviceName)); // Thay khoảng trắng bằng gạch dưới

        return in_array($serviceName, $this->ignore_checkin_time);
    }

    public function checkTicket(Request $request) 
    {
        try {
            // Decode ticket code từ base64
            $ticketCode = base64_decode($request->ticket_code);
            if (!$ticketCode) {
                return $this->errorResponse('Mã vé không hợp lệ');
            }

            // Kiểm tra trong bảng checked_ticket trước
            $checkedTicket = CheckedTicket::where('code', $ticketCode)->first();
            
            if ($checkedTicket) {
                return $this->successResponse([
                    'exists' => true,
                    'source' => 'checked_ticket',
                    'ticket' => [
                        'code' => $checkedTicket->code,
                        'name' => $checkedTicket->name,
                        'status' => $checkedTicket->status,
                        'checkin_at' => $checkedTicket->checkin_at ? 
                            Carbon::parse($checkedTicket->checkin_at)
                                ->setTimezone('Asia/Ho_Chi_Minh')
                                ->format('H:i:s d/m/Y') : null,
                        'checkout_at' => $checkedTicket->checkout_at ?
                            Carbon::parse($checkedTicket->checkout_at)
                                ->setTimezone('Asia/Ho_Chi_Minh')
                                ->format('H:i:s d/m/Y') : null,
                        'checkin_by' => $checkedTicket->checkin_by,
                        'checkout_by' => $checkedTicket->checkout_by,
                        'staff_id' => $checkedTicket->staff->code
                    ]
                ], 'Kiểm tra vé thành công');
            }

            // Nếu không có trong checked_ticket, kiểm tra trong bảng tickets
            $ticket = Ticket::where('code', $ticketCode)->first();
            
            if ($ticket) {
                return $this->successResponse([
                    'exists' => true,
                    'source' => 'tickets',
                    'ticket' => [
                        'code' => $ticket->code,
                        'name' => $ticket->service_name,
                        'status' => $ticket->status,
                        'issue_date' => Carbon::parse($ticket->issued_date)
                            ->setTimezone('Asia/Ho_Chi_Minh')
                            ->format('d/m/Y'),
                        'expired_date' => Carbon::parse($ticket->expired_date)
                            ->setTimezone('Asia/Ho_Chi_Minh')
                            ->format('d/m/Y'),
                        'price' => $ticket->price
                    ]
                ], 'Kiểm tra vé thành công');
            }

            // Không tìm thấy vé trong cả 2 bảng
            return $this->successResponse([
                'exists' => false,
                'source' => null,
                'ticket' => null
            ], 'Không tìm thấy thông tin vé');

        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage(), 500);
        }
    }
} 
