<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff', function (Blueprint $table) {
            $table->id();
            $table->string('type', 45)->default('DRIVER');
            $table->foreignId('group_id')->constrained('staff_group');
            $table->string('zalo_id', 45)->nullable();
            $table->string('code', 45);
            $table->string('name', 200);
            $table->string('phone', 45)->nullable();
            $table->string('username', 45);
            $table->text('password');
            $table->date('birthdate')->nullable();
            $table->text('address')->nullable();
            $table->text('avatar_url')->nullable();
            $table->string('card_id', 45)->nullable();
            $table->string('status', 45)->default('ACTIVE');
            $table->integer('vehical_size')->default(6);
            $table->integer('vehical_type')->default(1);
            $table->integer('is_master')->default(0);
            $table->string('fcm_token', 200)->nullable();
            $table->foreignId('default_gate_id')->constrained('gate');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff');
    }
}; 