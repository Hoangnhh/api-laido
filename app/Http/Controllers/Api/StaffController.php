<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\ApiResponse;
use App\Models\Staff;
use App\Models\GateStaffShift;
use App\Models\GateShift;
use Carbon\Carbon;
use Illuminate\Http\Request;

class StaffController extends Controller
{
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
                ->with(['gate:id,name', 'gateShift:id,date'])
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

            // Tính số người đứng trước trong hàng đợi
            $queuePosition = 0;
            if ($currentShift && $currentShift->status === GateStaffShift::STATUS_WAITING) {
                $queuePosition = GateStaffShift::where('gate_shift_id', $currentShift->gate_shift_id)
                    ->where('status', GateStaffShift::STATUS_WAITING)
                    ->where('index', '<', $currentShift->index)
                    ->count();
            }

            return $this->successResponse([
                'staff' => [
                    'id' => $staff->id,
                    'phone' => $staff->phone,
                    'name' => $staff->name,
                    'code' => $staff->code,
                    'vehicle_size' => $staff->vehical_size,
                    'age' => Carbon::parse($staff->birthday)->age,
                    'card_id' => $staff->card_id,
                    'address' => $staff->address,
                    'shift' => $currentShift ? [
                        'id' => $currentShift->id,
                        'index' => $currentShift->index,
                        'queue_position' => $queuePosition,
                        'gate' => $currentShift->gate->name,
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
} 