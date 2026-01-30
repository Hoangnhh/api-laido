<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== KIỂM TRA NHANH ===" . PHP_EOL . PHP_EOL;

// Tổng quan cơ bản
$totalPayment = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->whereDate('date', '>=', $fromDate)
    ->whereDate('date', '<=', $toDate)
    ->sum('amount');

$totalCommission = DB::table('checked_ticket')
    ->where('paid', 1)
    ->where('date', '>=', $fromDate)
    ->where('date', '<=', $toDate)
    ->sum('commission');

echo "Tổng Payment: " . number_format($totalPayment, 0, ',', '.') . ' đ' . PHP_EOL;
echo "Tổng Commission: " . number_format($totalCommission, 0, ',', '.') . ' đ' . PHP_EOL;
echo "Chênh lệch: " . number_format($totalPayment - $totalCommission, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// Kiểm tra vé có checkin_by != username
$mismatch = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->whereRaw('ct.checkin_by != s.username')
    ->select(
        DB::raw('COUNT(DISTINCT ct.code) as count'),
        DB::raw('SUM(ct.commission) as total')
    )
    ->first();

echo "Vé không match (checkin_by != username):" . PHP_EOL;
echo "- Số vé: " . number_format($mismatch->count) . PHP_EOL;
echo "- Tổng tiền: " . number_format($mismatch->total, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// List nhân viên có vấn đề
echo "Nhân viên có vé không match:" . PHP_EOL;
$staffIssues = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->whereRaw('ct.checkin_by != s.username')
    ->select(
        's.code',
        's.name',
        's.username',
        'ct.checkin_by',
        DB::raw('COUNT(DISTINCT ct.code) as ticket_count'),
        DB::raw('SUM(ct.commission) as total')
    )
    ->groupBy('s.code', 's.name', 's.username', 'ct.checkin_by')
    ->get();

foreach ($staffIssues as $issue) {
    echo "- NV {$issue->code} ({$issue->name}): {$issue->ticket_count} vé, " .
         number_format($issue->total, 0, ',', '.') . " đ" . PHP_EOL;
    echo "  Username: {$issue->username}, Checkin by: {$issue->checkin_by}" . PHP_EOL;
}
