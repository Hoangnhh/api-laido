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
            $table->id();
            $table->uuid('ref_id');
            $table->string('code', 50);
            $table->string('service_name', 200);
            $table->dateTime('issued_date');
            $table->dateTime('expired_date');
            $table->integer('price');
            $table->string('status', 20);
            $table->integer('print_count');
            $table->string('created_by', 50);
            $table->dateTime('created_date');
            $table->timestamps();
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