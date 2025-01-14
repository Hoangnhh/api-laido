<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('gate_staff_shifts', function (Blueprint $table) {
            $table->id();
            $table->dateTime('date')->nullable();
            $table->unsignedBigInteger('gate_shift_id');
            $table->integer('index');
            $table->string('gate_id')->nullable();
            $table->string('staff_id');
            $table->string('status')->default('WAITING');
            $table->integer('checkin_gate_id')->nullable();
            $table->dateTime('checkout_at')->nullable();
            $table->integer('checked_ticket_num')->default(0);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('gate_staff_shifts');
    }
}; 