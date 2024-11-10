<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200);
            $table->string('status', 45)->default('ACTIVE');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_groups');
    }
}; 