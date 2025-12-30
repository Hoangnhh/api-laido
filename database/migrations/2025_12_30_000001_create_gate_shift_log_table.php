<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gate_shift_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained('gate_shift');
            $table->string('previous_status', 50);
            $table->string('new_status', 50);
            $table->dateTime('updated_at')->useCurrent();
            $table->string('updated_by', 50)->default('auto_system');
            
            // Note: Timestamps() would add created_at and updated_at, 
            // but the SQL dump only showed updated_at.
            // However, Laravel usually expects both or none if $timestamps = false.
            // I will match the SQL dump.
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gate_shift_log');
    }
};
