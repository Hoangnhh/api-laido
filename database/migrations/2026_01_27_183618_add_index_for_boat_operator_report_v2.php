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
        Schema::table('checked_ticket', function (Blueprint $table) {
            // Index cho báo cáo boat operator payment v2
            // Query: WHERE date >= ? AND date <= ? GROUP BY staff_id, date, commission
            $table->index(['date', 'staff_id', 'checkin_by', 'commission'], 'idx_boat_operator_report_v2');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checked_ticket', function (Blueprint $table) {
            $table->dropIndex('idx_boat_operator_report_v2');
        });
    }
};
