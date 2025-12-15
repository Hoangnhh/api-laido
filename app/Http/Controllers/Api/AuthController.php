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
}
