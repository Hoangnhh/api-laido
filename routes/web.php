<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AuthController;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Admin\UserController;

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
        
        Route::post('/logout', [AuthController::class, 'logout'])->name('admin.logout');
    });
});

Route::prefix('api/admin')->group(function () {
    Route::apiResource('users', UserController::class);
});