<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_execution_log_details', function (Blueprint $table) {
            $table->id('log_id');
            $table->string('event_name', 255)->nullable();
            $table->dateTime('execution_time')->nullable();
            $table->string('status', 50)->nullable();
            $table->integer('success_count')->nullable();
            $table->integer('error_count')->nullable();
            $table->text('success_ids')->nullable();
            $table->text('error_message')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_execution_log_details');
    }
};
