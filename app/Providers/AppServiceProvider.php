<?php

namespace App\Providers;

use Illuminate\Support\Facades\URL; // <-- Thêm dòng này
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (config('app.env') === 'production') { // <-- Chỉ áp dụng cho production
            URL::forceScheme('https'); // <-- Thêm dòng này
        }
    }
}