<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_tickets', function (Blueprint $table) {
            $table->id();
            $table->integer('checked_tickets_id');
            $table->string('checked_tickets_code', 255);
            $table->dateTime('checkin_at');
            $table->dateTime('sync_date')->nullable()->useCurrent();
            $table->tinyInteger('status')->default(0);
            
            $table->index('checked_tickets_code', 'idx_checked_tickets_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_tickets');
    }
};
