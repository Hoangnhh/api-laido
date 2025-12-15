<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Traits\ApiResponse;
use App\Models\Staff;
use App\Services\ZaloService;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Exception;

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
     * - Nhận phone token từ Zalo (encrypted token, không phải số thật)
     * - Verify token với Zalo API để lấy số điện thoại thật
     * - Xác thực số điện thoại với database
     * - Nếu số điện thoại tồn tại và staff đang active thì đăng nhập thành công
     * - Nếu số điện thoại chưa tồn tại thì từ chối đăng nhập
     */
    public function zaloLogin(Request $request, ZaloService $zaloService)
    {
        try {
            $request->validate([
                'phone' => 'required|string',
                'zalo_id' => 'nullable|string',
                'name' => 'nullable|string',
                'avatar' => 'nullable|string',
            ]);

            $phoneInput = $request->phone;
            $realPhone = $phoneInput;

            Log::info('Zalo login attempt', [
                'phone_input_length' => strlen($phoneInput),
                'zalo_id' => $request->zalo_id,
            ]);

            // Kiểm tra phone có phải là token không (dài hơn 20 ký tự thường là token)
            if ($zaloService->isPhoneToken($phoneInput)) {
                Log::info('Phone is a token, verifying with Zalo API...');

                try {
                    // Verify token để lấy số điện thoại thật
                    $realPhone = $zaloService->verifyPhoneToken($phoneInput);

                    if (!$realPhone) {
                        return $this->errorResponse('Không thể xác thực số điện thoại từ Zalo', 400);
                    }

                    Log::info('Verified phone successfully', ['phone' => $realPhone]);

                } catch (Exception $e) {
                    Log::error('Token verification failed', [
                        'error' => $e->getMessage()
                    ]);

                    return $this->errorResponse('Không thể xác thực số điện thoại từ Zalo. Vui lòng thử lại.', 400);
                }
            }

            // Chuẩn hóa số điện thoại (bỏ khoảng trắng, ký tự đặc biệt)
            $realPhone = $zaloService->normalizePhoneNumber($realPhone);

            Log::info('Searching for staff', ['phone' => $realPhone]);

            // Tìm staff theo số điện thoại và status ACTIVE
            $staff = Staff::where('phone', $realPhone)
                ->where('status', Staff::STATUS_ACTIVE)
                ->first();

            // Nếu không tìm thấy số điện thoại trong database thì từ chối đăng nhập
            if (!$staff) {
                Log::warning('Phone not found in database', ['phone' => $realPhone]);
                return $this->errorResponse('Số điện thoại chưa được đăng ký trong hệ thống', 401);
            }

            Log::info('Staff found', ['staff_id' => $staff->id, 'username' => $staff->username]);

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
                Log::info('Updated staff info from Zalo', ['staff_id' => $staff->id, 'updates' => $updateData]);
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

            Log::info('Zalo login successful', ['staff_id' => $staff->id]);

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

        } catch (Exception $e) {
            Log::error('Zalo login error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->errorResponse('Lỗi hệ thống. Vui lòng thử lại sau.', 500);
        }
    }
}
