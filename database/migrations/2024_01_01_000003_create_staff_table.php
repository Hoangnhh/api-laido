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
            $table->string('type', 45)->default('OFFICE');
            $table->foreignId('group_id')->constrained('staff_group');
            $table->string('code', 45)->unique();
            $table->string('name', 200);
            $table->string('phone', 45)->nullable();
            $table->string('username', 45)->unique();
            $table->string('password', 200);
            $table->date('birthdate')->nullable();
            $table->string('address', 500)->nullable();
            $table->string('avatar_url', 500)->nullable();
            $table->string('card_id', 45)->nullable();
            $table->date('card_date')->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->string('bank_account', 45)->nullable();
            $table->string('status', 45)->default('ACTIVE');
            $table->integer('vehical_size')->nullable();
            $table->tinyInteger('vehical_type')->nullable();
            $table->tinyInteger('is_master')->default(0);
            $table->string('fcm_token', 500)->nullable();
            $table->foreignId('default_gate_id')->nullable()->constrained('gate');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff');
    }
}; 