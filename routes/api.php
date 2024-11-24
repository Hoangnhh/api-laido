<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Middleware\VerifyJWTToken;
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
        Route::middleware([VerifyJWTToken::class])->group(function () {
            // Staff routes
            Route::group(['prefix' => 'staff'], function () {
                Route::get('get-staff-info', [StaffController::class, 'getInfo']);
                Route::get('get-checked-tickets', [StaffController::class, 'getCheckedTickets']);
                Route::get('get-dashboard-info', [StaffController::class, 'getDashboardInfo']);
            });

            // Ticket routes
            Route::group(['prefix' => 'ticket'], function () {
                Route::get('use-ticket', [TicketController::class, 'useTicket']);
            });

            // Notification routes
            Route::group(['prefix' => 'notifications'], function () {
                Route::post('token', [StaffController::class, 'updateFcmToken']);
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