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
            $table->foreignId('gate_id')->nullable()->default(0);
            $table->date('date');
            $table->boolean('status')->default(1);
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