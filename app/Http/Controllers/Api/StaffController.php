<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\ApiResponse;
use App\Models\Staff;
use App\Models\GateStaffShift;
use Carbon\Carbon;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    use ApiResponse;

    public function getInfo(Request $request)
    {
        try {
            // Lấy user_id từ JWT token đã được decode trong middleware
            $userId = $request->user_id;
            
            $staff = Staff::with('group')
                ->where('id', $userId)
                ->where('status', Staff::STATUS_ACTIVE)
                ->first();

            if (!$staff) {
                return $this->errorResponse('Không tìm thấy thông tin nhân viên', 404);
            }

            // Lấy ca làm việc hiện tại của nhân viên
            $currentShift = GateStaffShift::where('staff_id', $userId)
                ->whereIn('status', [GateStaffShift::STATUS_CHECKIN, GateStaffShift::STATUS_WAITING])
                ->with('gate:id,name')
                ->with('gateShift:id,date')
                ->orderBy('id')
                ->first();

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
                        'gate' => $currentShift->gate->name,
                        'date' => $currentShift->gateShift->date,
                        'status' => $currentShift->status,
                        'checkin_at' => $currentShift->checkin_at,
                    ] : null,
                    'revenue' => "5000000", // Doanh thu trong ngày
                    'avatar' => $staff->avatar_url,
                    'group' => [
                        'id' => $staff->group->id,
                        'name' => $staff->group->name
                    ]
                ]
            ], 'Lấy thông tin nhân viên thành công');

        } catch (\Exception $e) {
            return $this->errorResponse('Có lỗi xảy ra khi lấy thông tin nhân viên', 500);
        }
    }
} 