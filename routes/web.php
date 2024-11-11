<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AuthController;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\StaffController;
use App\Http\Controllers\Admin\StaffGroupController;
use App\Http\Controllers\Admin\GateController;
use App\Http\Controllers\Admin\ShiftAssignmentController;

Route::prefix('admin')->group(function () {
    Route::get('/', function () {
        if (Auth::check()) {
            return redirect()->route('admin.dashboard');
        }
        return view('admin.login');
    })->name('admin.login');
    
    Route::post('/login', [AuthController::class, 'login'])->name('admin.login.post');
    
    Route::middleware(['auth'])->group(function () {
        Route::get('/dashboard', function () {
            return view('admin.dashboard');
        })->name('admin.dashboard');
        
        Route::get('/users', function () {
            return view('admin.user-manager');
        })->name('admin.user-manager');

        Route::get('/staff', function () {
            return view('admin.staff-manager');
        })->name('admin.staff-manager');

        Route::get('/gate', function () {
            return view('admin.gate');
        })->name('admin.gate');

        Route::get('/staff-group', function () {
            return view('admin.staff-group');
        })->name('admin.staff-group');

        Route::get('/shift-assignments', function () {
            return view('admin.shift-assignments');
        })->name('admin.shift-assignments');

        Route::get('/add-shift-gate', function () {
            return view('admin.add-shift-gate');
        })->name('admin.add-shift-gate');

        Route::get('/tickets', function () {
            return view('admin.tickets');
        })->name('admin.tickets');

        Route::get('/settings', function () {
            return view('admin.settings');
        })->name('admin.settings');

        Route::get('/payment-report', function () {
            return view('admin.payment-report');
        })->name('admin.payment-report');
        
        Route::post('/logout', [AuthController::class, 'logout'])->name('admin.logout');

        // Thêm route toggle status cho staff
        Route::put('/staffs/{staff}/toggle-status', [StaffController::class, 'toggleStatus'])
            ->name('admin.staffs.toggle-status');

        // Thêm route cho staff
        Route::post('/staffs', [StaffController::class, 'store'])
            ->name('admin.staffs.store');
        Route::put('/staffs/{staff}', [StaffController::class, 'update'])
            ->name('admin.staffs.update');

        Route::get('/current-user', function () {
            return response()->json(auth()->user());
        });
    });

    // Route login cho admin
    Route::get('/login', function () {
        return view('admin.login');
    })->name('login');
});

Route::prefix('api/admin')->group(function () {
    Route::apiResource('users', UserController::class);
    Route::apiResource('staffs', StaffController::class);
    Route::apiResource('staff-groups', StaffGroupController::class);
    Route::apiResource('gates', GateController::class);
    Route::get('/shift-assignments-data', [ShiftAssignmentController::class, 'getData']);
    Route::get('/staffs-by-group/{groupId}', [StaffController::class, 'getStaffsByGroup']);
    Route::get('/shift-assignments/get-staffs', [ShiftAssignmentController::class, 'getStaffsByGroup']);
    Route::post('/shift-assignments', [ShiftAssignmentController::class, 'createShiftAssignment'])
    ->name('admin.shift-assignments.store');
});