<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\ApiResponse;
use App\Models\Staff;
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

            return $this->successResponse([
                'staff' => [
                    'id' => $staff->id,
                    'phone' => $staff->phone,
                    'name' => $staff->name,
                    'age' => $staff->age,
                    'card_id' => $staff->card_id,
                    'address' => $staff->address,
                    'shift' => "Ca 1", // Ca làm việc
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