<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('extra_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gate_id')->nullable()->constrained('gates');
            $table->date('date');
            $table->foreignId('staff_id')->constrained('staff');
            $table->dateTime('checkin_at')->nullable();
            $table->dateTime('checkout_at')->nullable();
            $table->string('status', 45)->default('WAITING');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extra_shifts');
    }
}; 