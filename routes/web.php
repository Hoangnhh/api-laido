<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AuthController;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\StaffController;
use App\Http\Controllers\Admin\StaffGroupController;

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

        Route::get('/shifts', function () {
            return view('admin.shift-manager');
        })->name('admin.shift-manager');

        Route::get('/shift-assignments', function () {
            return view('admin.shift-assignments');
        })->name('admin.shift-assignments');

        Route::get('/tickets', function () {
            return view('admin.tickets');
        })->name('admin.tickets');

        Route::get('/settings', function () {
            return view('admin.settings');
        })->name('admin.settings');
        
        Route::post('/logout', [AuthController::class, 'logout'])->name('admin.logout');
    });
});

Route::prefix('api/admin')->group(function () {
    Route::apiResource('users', UserController::class);
    Route::apiResource('staffs', StaffController::class);
    Route::apiResource('staff-groups', StaffGroupController::class);
});