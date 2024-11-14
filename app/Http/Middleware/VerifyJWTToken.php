<?php

namespace App\Http\Middleware;

use Closure;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Illuminate\Http\Request;
use Exception;

class VerifyJWTToken
{
    public function handle(Request $request, Closure $next)
    {
        try {
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'message' => 'Token không được cung cấp'
                ], 401);
            }

            // Giải mã token
            $decoded = JWT::decode($token, new Key(config('app.key'), 'HS256'));
            
            // Thêm thông tin user vào request để các controller có thể sử dụng
            $request->merge(['user' => $decoded]);
            
            return $next($request);

        } catch (ExpiredException $e) {
            return response()->json([
                'message' => 'Token đã hết hạn'
            ], 401);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Token không hợp lệ'
            ], 401);
        }
    }
} 