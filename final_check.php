<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== KIỂM TRA CUỐI CÙNG - TỔNG HỢP ===" . PHP_EOL . PHP_EOL;

// 1. Tổng từ bảng PAYMENT
$totalPayment = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->whereDate('date', '>=', $fromDate)
    ->whereDate('date', '<=', $toDate)
    ->sum('amount');
echo "1. Tổng từ bảng PAYMENT (Thanh toán nhân viên): " . number_format($totalPayment, 0, ',', '.') . ' đ' . PHP_EOL;

// 2. Tổng từ CHECKED_TICKET (theo điều kiện báo cáo lái đò)
$totalBoatReport = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->whereRaw('ct.checkin_by = s.username')
    ->sum('ct.commission');
echo "2. Tổng từ CHECKED_TICKET (Báo cáo lái đò): " . number_format($totalBoatReport, 0, ',', '.') . ' đ' . PHP_EOL;

// 3. Chênh lệch
$difference = $totalPayment - $totalBoatReport;
echo "3. Chênh lệch: " . number_format($difference, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 4. Số vé không match
$mismatchCount = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->whereRaw('ct.checkin_by != s.username')
    ->count();

$mismatchTotal = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->whereRaw('ct.checkin_by != s.username')
    ->sum('ct.commission');

echo "4. Số vé có vấn đề (checkin_by != username): " . number_format($mismatchCount) . ' vé' . PHP_EOL;
echo "5. Tổng tiền của vé có vấn đề: " . number_format($mismatchTotal, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 5. Chi tiết nhân viên còn có vấn đề
echo "=== NHÂN VIÊN CÒN CÓ VẤN ĐỀ ===" . PHP_EOL . PHP_EOL;

$staffIssues = DB::select("
    SELECT
        s.code,
        s.name,
        s.username as staff_username,
        ct.checkin_by,
        COUNT(DISTINCT ct.code) as ticket_count,
        SUM(ct.commission) as total_amount
    FROM checked_ticket ct
    JOIN staff s ON ct.staff_id = s.id
    WHERE ct.paid = 1
        AND ct.date >= ?
        AND ct.date <= ?
        AND ct.checkin_by != s.username
    GROUP BY s.code, s.name, s.username, ct.checkin_by
    ORDER BY total_amount DESC
", [$fromDate, $toDate]);

if (count($staffIssues) > 0) {
    echo str_pad('Mã NV', 10) . ' | ' .
         str_pad('Tên NV', 25) . ' | ' .
         str_pad('Username NV', 15) . ' | ' .
         str_pad('Checkin by', 15) . ' | ' .
         str_pad('Số vé', 8) . ' | ' .
         str_pad('Tổng tiền', 15) . PHP_EOL;
    echo str_repeat('-', 110) . PHP_EOL;

    foreach ($staffIssues as $issue) {
        echo str_pad($issue->code, 10) . ' | ' .
             str_pad($issue->name, 25) . ' | ' .
             str_pad($issue->staff_username, 15) . ' | ' .
             str_pad($issue->checkin_by, 15) . ' | ' .
             str_pad(number_format($issue->ticket_count), 8) . ' | ' .
             str_pad(number_format($issue->total_amount, 0, ',', '.'), 15) . PHP_EOL;
    }
    echo PHP_EOL;
} else {
    echo "✓ Không còn vấn đề nào!" . PHP_EOL . PHP_EOL;
}

// 6. Đánh giá
if ($difference == 0) {
    echo "✓✓✓ HOÀN HẢO! Hai báo cáo đã khớp hoàn toàn!" . PHP_EOL;
} elseif ($difference <= 500000) {
    echo "✓ TỐT! Chênh lệch nhỏ, chỉ còn " . number_format($difference, 0, ',', '.') . ' đ' . PHP_EOL;
    echo "  Có thể do lỗi nhập liệu nhỏ của " . $mismatchCount . " vé." . PHP_EOL;
} else {
    echo "⚠ CÒN VẤN ĐỀ! Chênh lệch còn " . number_format($difference, 0, ',', '.') . ' đ' . PHP_EOL;
    echo "  Cần kiểm tra và sửa " . $mismatchCount . " vé có vấn đề." . PHP_EOL;
}
