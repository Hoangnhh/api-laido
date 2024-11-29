<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function sendNotification(Request $request)
    {
        try {
            $staff = Staff::findOrFail($request->staff_id);
            
            $result = $staff->sendNotification(
                'Tiêu đề thông báo',
                'Nội dung thông báo',
                [
                    'type' => 'notification_type',
                    'data' => 'additional_data'
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Gửi thông báo thành công'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi gửi thông báo: ' . $e->getMessage()
            ], 500);
        }
    }
} 