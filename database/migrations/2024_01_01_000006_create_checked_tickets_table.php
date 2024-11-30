<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checked_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('code', 45);
            $table->string('name', 45)->nullable();
            $table->string('status', 45)->default('CHECKIN');
            $table->date('date');
            $table->dateTime('checkin_at')->nullable();
            $table->dateTime('checkout_at')->nullable();
            $table->string('checkin_by', 45)->nullable();
            $table->string('checkout_by', 45)->nullable();
            $table->foreignId('payment_id')->nullable();
            $table->boolean('paid')->default(false);
            $table->string('price', 20)->default('0');
            $table->integer('commisson')->default(0);
            $table->boolean('is_checkout_with_other')->default(false);
            $table->foreignId('gate_shift_staff_id')->nullable();
            $table->foreignId('staff_id')->constrained('staff');
            $table->foreignId('extra_shift_id')->nullable()->constrained('extra_shifts');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checked_tickets');
    }
}; 