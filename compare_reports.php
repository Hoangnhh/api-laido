<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== SO SÁNH HAI MÀN HÌNH BÁO CÁO ===" . PHP_EOL . PHP_EOL;

// 1. TỔNG TỪ MÀN THANH TOÁN (PAYMENT)
echo "1. MÀN THANH TOÁN (Payment Report)" . PHP_EOL;
$totalPayment = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->sum('amount');
echo "   - Tổng tất cả payment: " . number_format($totalPayment, 0, ',', '.') . ' đ' . PHP_EOL;

$totalPaymentInRange = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->whereDate('date', '>=', $fromDate)
    ->whereDate('date', '<=', $toDate)
    ->sum('amount');
echo "   - Trong khoảng " . $fromDate . " - " . $toDate . ": " . number_format($totalPaymentInRange, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 2. TỔNG TỪ MÀN THỐNG KÊ THEO NHÂN VIÊN (BOAT OPERATOR PAYMENT REPORT)
echo "2. MÀN THỐNG KÊ THEO NHÂN VIÊN (Boat Operator Payment Report)" . PHP_EOL;

// Logic giống như trong ReportController.php - getBoatOperatorPaymentReport
$boatOperatorData = DB::select("
    SELECT
        s.id as staff_id,
        s.code as staff_code,
        s.name as staff_name,
        ct.name as ticket_type,
        ct.commission as price,
        CASE
            WHEN ct.checkin_by = s.username AND ct.checkout_by = s.username THEN '2 Chiều'
            WHEN ct.checkin_by = s.username AND (ct.checkout_by IS NULL OR ct.checkout_by != s.username) THEN 'Chiều vào'
        END as direction,
        COUNT(DISTINCT ct.code) as quantity,
        SUM(ct.commission) as total_amount
    FROM checked_ticket ct
    INNER JOIN staff s ON ct.staff_id = s.id
    WHERE ct.date >= ?
      AND ct.date <= ?
      AND ct.checkin_by = s.username
      AND ct.paid = 1
    GROUP BY s.id, s.code, s.name, ct.name, ct.commission,
             CASE
                 WHEN ct.checkin_by = s.username AND ct.checkout_by = s.username THEN '2 Chiều'
                 WHEN ct.checkin_by = s.username AND (ct.checkout_by IS NULL OR ct.checkout_by != s.username) THEN 'Chiều vào'
             END
", [$fromDate, $toDate]);

$totalBoatOperator = 0;
$totalTickets = 0;
foreach ($boatOperatorData as $row) {
    $totalBoatOperator += $row->total_amount;
    $totalTickets += $row->quantity;
}

echo "   - Tổng tiền: " . number_format($totalBoatOperator, 0, ',', '.') . ' đ' . PHP_EOL;
echo "   - Tổng số vé: " . number_format($totalTickets) . ' vé' . PHP_EOL . PHP_EOL;

// 3. CHÊNH LỆCH
echo "3. CHÊNH LỆCH" . PHP_EOL;
$difference = $totalPaymentInRange - $totalBoatOperator;
echo "   - Payment - Boat Operator Report: " . number_format($difference, 0, ',', '.') . ' đ' . PHP_EOL;

if ($difference > 0) {
    echo "   - Payment NHIỀU HƠN Boat Operator Report" . PHP_EOL;
} elseif ($difference < 0) {
    echo "   - Payment ÍT HƠN Boat Operator Report" . PHP_EOL;
} else {
    echo "   - ✓✓✓ HAI BÁO CÁO KHỚP HOÀN TOÀN!" . PHP_EOL;
}

$percentDiff = ($totalPaymentInRange > 0) ? ($difference / $totalPaymentInRange) * 100 : 0;
echo "   - Tỷ lệ chênh lệch: " . number_format($percentDiff, 4) . '%' . PHP_EOL . PHP_EOL;

// 4. PHÂN TÍCH VÉ KHÔNG MATCH
echo "4. PHÂN TÍCH VÉ KHÔNG MATCH (checkin_by != username)" . PHP_EOL;

$mismatchTickets = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->whereRaw('ct.checkin_by != s.username')
    ->select(
        DB::raw('COUNT(DISTINCT ct.code) as ticket_count'),
        DB::raw('SUM(ct.commission) as total_commission')
    )
    ->first();

echo "   - Số vé không match: " . number_format($mismatchTickets->ticket_count) . ' vé' . PHP_EOL;
echo "   - Tổng tiền vé không match: " . number_format($mismatchTickets->total_commission ?? 0, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 5. ĐÁNH GIÁ
echo "5. ĐÁNH GIÁ" . PHP_EOL;
if ($difference == 0) {
    echo "   ✓✓✓ HOÀN HẢO! Hai báo cáo đã khớp hoàn toàn!" . PHP_EOL;
} elseif (abs($difference) <= 500000) {
    echo "   ✓ TỐT! Chênh lệch nhỏ (dưới 500.000 đ)" . PHP_EOL;
    echo "   Chỉ còn " . number_format($mismatchTickets->ticket_count) . " vé có vấn đề nhỏ." . PHP_EOL;
} elseif (abs($difference) <= 5000000) {
    echo "   ⚠ CÓ THỂ CHẤP NHẬN! Chênh lệch ở mức trung bình (dưới 5 triệu đ)" . PHP_EOL;
    echo "   Cần kiểm tra " . number_format($mismatchTickets->ticket_count) . " vé có vấn đề." . PHP_EOL;
} else {
    echo "   ✗ CÒN VẤN ĐỀ LỚN! Chênh lệch cao (trên 5 triệu đ)" . PHP_EOL;
    echo "   Cần xử lý ngay " . number_format($mismatchTickets->ticket_count) . " vé có vấn đề." . PHP_EOL;
}

// 6. CHI TIẾT NHÂN VIÊN CÓ VẤN ĐỀ
if ($mismatchTickets->ticket_count > 0) {
    echo PHP_EOL . "6. CHI TIẾT NHÂN VIÊN CÒN CÓ VẤN ĐỀ" . PHP_EOL;

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

    echo str_pad('Mã NV', 10) . ' | ' .
         str_pad('Tên NV', 25) . ' | ' .
         str_pad('Username', 15) . ' | ' .
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
}
