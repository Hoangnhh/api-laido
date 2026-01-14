<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('gate_staff_shift', function (Blueprint $table) {
            $table->id();
            $table->date('date')->nullable();
            $table->foreignId('gate_shift_id')->constrained('gate_shift');
            $table->integer('index');
            $table->foreignId('gate_id')->nullable()->constrained('gate');
            $table->foreignId('staff_id')->constrained('staff');
            $table->string('status')->default('WAITING');
            $table->integer('checkin_gate_id')->nullable();
            $table->dateTime('checkin_at')->nullable();
            $table->dateTime('checkout_at')->nullable();
            $table->integer('checked_ticket_num')->default(0);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('gate_staff_shift');
    }
}; 