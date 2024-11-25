<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('extra_shifts', function (Blueprint $table) {
            $table->id()->autoIncrement();
            $table->date('date');
            $table->unsignedBigInteger('staff_id')->default(0);
            $table->integer('recheckin_times')->default(0);
            $table->text('recheckin_at')->nullable();
            $table->string('status')->default('ACTIVE');
            $table->string('create_by', 45);
            $table->string('update_by', 45)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('extra_shifts');
    }
}; 