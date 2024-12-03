<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id');
            $table->dateTime('date');
            $table->integer('amount')->default(0);
            $table->string('received_account', 45)->nullable();
            $table->string('payment_method', 45)->default('BANK_TRANSFER');
            $table->string('status', 45)->default('ACTIVE');
            $table->text('delete_reason')->nullable();
            $table->string('bank', 45)->nullable();
            $table->text('note')->nullable();
            $table->string('transaction_code', 45)->nullable();
            $table->string('created_by', 45);
            $table->string('updated_by', 45)->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('payments');
    }
}; 