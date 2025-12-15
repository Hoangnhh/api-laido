<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\ApiResponse;
use App\Models\Staff;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    use ApiResponse;

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $staff = Staff::where('username', $request->username)
            ->where('status', Staff::STATUS_ACTIVE)
            ->first();

        if (!$staff) {
            return $this->errorResponse('Thông tin đăng nhập không chính xác', 401);
        }

        if (!Hash::check($request->password, $staff->password)) {
            return $this->errorResponse('Thông tin đăng nhập không chính xác', 401);
        }

        $payload = [
            'user_id' => $staff->id,
            'code' => $staff->code,
            'phone' => $staff->phone,
            'username' => $staff->username,
            'name' => $staff->name,
            'type' => $staff->type,
            'group_id' => $staff->group_id,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24 * 30) // 30 ngày
        ];

        $token = JWT::encode($payload, config('app.key'), 'HS256');

        return $this->successResponse([
            'access_token' => $token,
            'user' => [
                'id' => $staff->id,
                'username' => $staff->username,
                'code' => $staff->code,
                'phone' => $staff->phone,
                'name' => $staff->name,
                'type' => $staff->type,
                'group' => $staff->group
            ]
        ], 'Đăng nhập thành công');
    }

    /**
     * Đăng nhập bằng Zalo
     * Xác thực số điện thoại từ Zalo với database
     * Nếu số điện thoại tồn tại và staff đang active thì đăng nhập thành công
     * Nếu số điện thoại chưa tồn tại thì từ chối đăng nhập
     */
    public function zaloLogin(Request $request)
    {
        $request->validate([
            'phone' => 'required|string',
            'zalo_id' => 'nullable|string',
            'name' => 'nullable|string',
            'avatar' => 'nullable|string',
        ]);

        $phone = $request->phone;

        // Tìm staff theo số điện thoại và status ACTIVE
        $staff = Staff::where('phone', $phone)
            ->where('status', Staff::STATUS_ACTIVE)
            ->first();

        // Nếu không tìm thấy số điện thoại trong database thì từ chối đăng nhập
        if (!$staff) {
            return $this->errorResponse('Số điện thoại chưa được đăng ký trong hệ thống', 401);
        }

        // Cập nhật thông tin từ Zalo nếu có (tùy chọn)
        $updateData = [];
        if ($request->has('name') && $request->name) {
            $updateData['name'] = $request->name;
        }
        if ($request->has('avatar') && $request->avatar) {
            $updateData['avatar_url'] = $request->avatar;
        }

        if (!empty($updateData)) {
            $staff->update($updateData);
        }

        // Tạo JWT token giống như login thông thường
        $payload = [
            'user_id' => $staff->id,
            'code' => $staff->code,
            'phone' => $staff->phone,
            'username' => $staff->username,
            'name' => $staff->name,
            'type' => $staff->type,
            'group_id' => $staff->group_id,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24 * 30) // 30 ngày
        ];

        $token = JWT::encode($payload, config('app.key'), 'HS256');

        return $this->successResponse([
            'access_token' => $token,
            'user' => [
                'id' => $staff->id,
                'username' => $staff->username,
                'code' => $staff->code,
                'phone' => $staff->phone,
                'name' => $staff->name,
                'type' => $staff->type,
                'group' => $staff->group
            ]
        ], 'Đăng nhập thành công');
    }
}
