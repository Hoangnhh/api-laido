<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AuthController;
use Illuminate\Support\Facades\Auth;

Route::prefix('admin')->group(function () {
    Route::get('/login', function () {
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
        
        Route::post('/logout', [AuthController::class, 'logout'])->name('admin.logout');
    });
});