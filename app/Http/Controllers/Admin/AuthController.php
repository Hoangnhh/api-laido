<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Carbon\Carbon;

class AuthController extends Controller
{
    private $licenseKey = 'Thinksoft@2025'; // Thay đổi key này thành key bí mật của bạn

    public function login(Request $request)
    {
        try {
            // Kiểm tra license trước
            $licenseStatus = $this->checkLicense();
            if (!$licenseStatus['valid']) {
                return response()->json([
                    'status' => 'error',
                    'message' => $licenseStatus['message']
                ], 403);
            }

            $credentials = $request->validate([
                'username' => 'required',
                'password' => 'required'
            ]);

            if (Auth::attempt($credentials)) {
                $request->session()->regenerate();
                
                return response()->json([
                    'status' => 'success',
                    'message' => 'Đăng nhập thành công',
                    'redirect' => route('admin.dashboard'),
                    'license' => [
                        'days_remaining' => $licenseStatus['days_remaining']
                    ]
                ]);
            }

            return response()->json([
                'status' => 'error',
                'message' => 'Thông tin đăng nhập không chính xác'
            ], 401);

        } catch (ValidationException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->errors()
            ], 422);
        }
    }

    public function checkLicenseStatus()
    {
        $licenseStatus = $this->checkLicense();
        return response()->json($licenseStatus);
    }

    private function checkLicense()
    {
        try {
            $licensePath = base_path('license.txt');
            if (!file_exists($licensePath)) {
                return [
                    'valid' => false,
                    'message' => 'Không tìm thấy file license',
                    'days_remaining' => 0
                ];
            }

            $licenseToken = file_get_contents($licensePath);
            $decoded = JWT::decode($licenseToken, new Key($this->licenseKey, 'HS256'));

            $expiredAt = Carbon::parse($decoded->expired_at);
            $now = Carbon::now();

            if ($now->gt($expiredAt)) {
                return [
                    'valid' => false,
                    'message' => 'Bạn đã hết hạn sử dụng phần mềm',
                    'days_remaining' => 0
                ];
            }

            $daysRemaining = round($now->diffInDays($expiredAt));

            return [
                'valid' => true,
                'message' => 'Bạn còn ' . $daysRemaining . ' ngày sử dụng phần mềm',
                'days_remaining' => $daysRemaining,
                'expired_at' => $expiredAt->format('Y-m-d')
            ];

        } catch (\Exception $e) {
            return [
                'valid' => false,
                'message' => 'Bạn đã hết hạn sử dụng phần mềm: ' . $e->getMessage(),
                'days_remaining' => 0
            ];
        }
    }

    public function logout(Request $request)
    {
        try {
            Auth::logout();
            
            $request->session()->invalidate();
            $request->session()->regenerateToken();
            
            return response()->json([
                'status' => 'success',
                'message' => 'Đăng xuất thành công',
                'redirect' => route('admin.login')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi đăng xuất',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 