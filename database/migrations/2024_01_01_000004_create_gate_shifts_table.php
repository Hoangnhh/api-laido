<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gate_shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gate_id')->constrained('gates');
            $table->integer('current_index')->default(1);
            $table->string('status', 45)->default('ACTIVE');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gate_shifts');
    }
}; 