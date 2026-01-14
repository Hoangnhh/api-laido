<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('action_logs', function (Blueprint $table) {
            $table->id();
            $table->string('action', 45);
            $table->string('table', 45)->nullable();
            $table->json('before_data')->nullable();
            $table->json('after_data')->nullable();
            $table->string('create_by', 45);
            $table->dateTime('create_at')->useCurrent();
        });
    }

    public function down()
    {
        Schema::dropIfExists('action_logs');
    }
}; 