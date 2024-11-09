<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        try {
            $credentials = $request->validate([
                'username' => 'required',
                'password' => 'required'
            ]);

            if (Auth::attempt($credentials)) {
                $request->session()->regenerate();
                
                return response()->json([
                    'status' => 'success',
                    'message' => 'Đăng nhập thành công',
                    'redirect' => route('admin.dashboard')
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