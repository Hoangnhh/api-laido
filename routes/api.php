<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Thêm middleware api và cors cho tất cả routes
Route::group(['middleware' => ['api']], function () {
    
    // API version 1
    Route::prefix('v1')->group(function () {
        
        // Public routes
        Route::group(['prefix' => 'auth'], function () {
            Route::post('login', [AuthController::class, 'login']);
        });

        // Protected routes
        Route::middleware('jwt.verify')->group(function () {
            // Staff routes
            Route::group(['prefix' => 'staffs'], function () {
                // Các route được bảo vệ bởi JWT
            });
        });
    });

    // Handle invalid routes
    Route::fallback(function () {
        return response()->json([
            'message' => 'Route không tồn tại'
        ], 404);
    });
}); 