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
        Schema::create('reviews', function (Blueprint $table) {
            $table->id()->autoIncrement();
            $table->string('staff_code', 45);
            $table->string('customer_name', 200);
            $table->string('customer_phone', 45);
            $table->string('email', 45)->nullable();
            $table->tinyInteger('stars')->default(1);
            $table->text('other_review')->nullable();
            $table->text('note')->nullable();
            $table->tinyInteger('is_view')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
}; 