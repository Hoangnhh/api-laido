<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->integer('id')->autoIncrement()->primary();
            $table->uuid('ref_id')->unique();
            $table->string('ticket_code', 50);
            $table->dateTime('issue_date');
            $table->dateTime('expired_date');
            $table->integer('price');
            $table->string('status', 20);
            $table->integer('print_count');
            $table->string('created_by', 50);
            $table->dateTime('created_date');
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrentOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
}; 