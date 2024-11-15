<?php

namespace App\Http\Middleware;

use Closure;
use Exception;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Illuminate\Http\Request;

class VerifyJWTToken
{
    public function handle(Request $request, Closure $next)
    {
        try {
            $token = $request->header('Authorization');
            
            if (!$token) {
                return response()->json(['error' => 'Token không được cung cấp'], 401);
            }

            // Xóa 'Bearer ' từ token nếu có
            $token = str_replace('Bearer ', '', $token);

            // Decode token
            $decoded = JWT::decode($token, new Key(config('app.key'), 'HS256'));
            
            // Thêm thông tin user vào request
            $request->merge([
                'user_id' => $decoded->user_id,
                'username' => $decoded->username,
                'type' => $decoded->type,
                'group_id' => $decoded->group_id
            ]);
            
            return $next($request);
            
        } catch (ExpiredException $e) {
            return response()->json(['error' => 'Token đã hết hạn','error_code' => 1000], 401);
        } catch (Exception $e) {
            return response()->json(['error' => 'Token không hợp lệ','error_code' => 1000], 401);
        }
    }
} 