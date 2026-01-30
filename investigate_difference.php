<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== ĐIỀU TRA CHÊNH LỆCH 49K vs 210K ===" . PHP_EOL . PHP_EOL;

// 1. Tính tổng PAYMENT
$totalPayment = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->whereDate('date', '>=', $fromDate)
    ->whereDate('date', '<=', $toDate)
    ->sum('amount');
echo "1. Tổng PAYMENT: " . number_format($totalPayment, 0, ',', '.') . ' đ' . PHP_EOL;

// 2. Tính tổng tất cả vé đã thanh toán (paid=1)
$totalAllPaidTickets = DB::table('checked_ticket')
    ->where('paid', 1)
    ->where('date', '>=', $fromDate)
    ->where('date', '<=', $toDate)
    ->sum('commission');
echo "2. Tổng commission TẤT CẢ vé đã thanh toán: " . number_format($totalAllPaidTickets, 0, ',', '.') . ' đ' . PHP_EOL;

// 3. Tính tổng vé MATCH (checkin_by = username)
$totalMatchTickets = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->whereRaw('ct.checkin_by = s.username')
    ->sum('ct.commission');
echo "3. Tổng commission vé MATCH (checkin_by = username): " . number_format($totalMatchTickets, 0, ',', '.') . ' đ' . PHP_EOL;

// 4. Tính tổng vé KHÔNG MATCH (checkin_by != username)
$totalMismatchTickets = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->whereRaw('ct.checkin_by != s.username')
    ->sum('ct.commission');
echo "4. Tổng commission vé KHÔNG MATCH (checkin_by != username): " . number_format($totalMismatchTickets, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 5. Kiểm tra logic
echo "=== KIỂM TRA LOGIC ===" . PHP_EOL;
$sumMatchAndMismatch = $totalMatchTickets + $totalMismatchTickets;
echo "Vé MATCH + Vé KHÔNG MATCH = " . number_format($sumMatchAndMismatch, 0, ',', '.') . ' đ' . PHP_EOL;
echo "Tổng tất cả vé = " . number_format($totalAllPaidTickets, 0, ',', '.') . ' đ' . PHP_EOL;
$diff1 = $totalAllPaidTickets - $sumMatchAndMismatch;
echo "Chênh lệch: " . number_format($diff1, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 6. So sánh với PAYMENT
echo "=== SO SÁNH VỚI PAYMENT ===" . PHP_EOL;
echo "PAYMENT: " . number_format($totalPayment, 0, ',', '.') . ' đ' . PHP_EOL;
echo "Tất cả vé đã thanh toán: " . number_format($totalAllPaidTickets, 0, ',', '.') . ' đ' . PHP_EOL;
$diff2 = $totalPayment - $totalAllPaidTickets;
echo "Chênh lệch (PAYMENT - Vé): " . number_format($diff2, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 7. Tính toán lý thuyết
echo "=== TÍNH TOÁN LÝ THUYẾT ===" . PHP_EOL;
echo "Nếu bỏ vé KHÔNG MATCH khỏi báo cáo:" . PHP_EOL;
echo "  Báo cáo lái đò = Vé MATCH = " . number_format($totalMatchTickets, 0, ',', '.') . ' đ' . PHP_EOL;
echo "  PAYMENT = " . number_format($totalPayment, 0, ',', '.') . ' đ' . PHP_EOL;
$theoreticalDiff = $totalPayment - $totalMatchTickets;
echo "  Chênh lệch lý thuyết = " . number_format($theoreticalDiff, 0, ',', '.') . ' đ' . PHP_EOL;
echo "  (Đây là số tiền bị thanh toán THỪA)" . PHP_EOL . PHP_EOL;

// 8. Kiểm tra xem có vé nào paid=1 nhưng không có staff_id không
$ticketsWithoutStaff = DB::table('checked_ticket')
    ->where('paid', 1)
    ->where('date', '>=', $fromDate)
    ->where('date', '<=', $toDate)
    ->whereNull('staff_id')
    ->orWhere('staff_id', 0)
    ->count();
echo "Vé paid=1 nhưng không có staff_id: " . $ticketsWithoutStaff . PHP_EOL;

// 9. Kiểm tra xem có vé nào staff_id không tồn tại trong bảng staff không
$ticketsWithInvalidStaff = DB::select("
    SELECT COUNT(*) as count, SUM(ct.commission) as total
    FROM checked_ticket ct
    LEFT JOIN staff s ON ct.staff_id = s.id
    WHERE ct.paid = 1
        AND ct.date >= ?
        AND ct.date <= ?
        AND ct.staff_id IS NOT NULL
        AND ct.staff_id != 0
        AND s.id IS NULL
", [$fromDate, $toDate]);

echo "Vé có staff_id không hợp lệ: " . number_format($ticketsWithInvalidStaff[0]->count) . ' vé' . PHP_EOL;
echo "Tổng tiền: " . number_format($ticketsWithInvalidStaff[0]->total ?? 0, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 10. Giải thích
echo "=== GIẢI THÍCH ===" . PHP_EOL;
echo "Chênh lệch thực tế: " . number_format($theoreticalDiff, 0, ',', '.') . ' đ' . PHP_EOL;
echo "Vé không match: " . number_format($totalMismatchTickets, 0, ',', '.') . ' đ' . PHP_EOL;

if ($theoreticalDiff != $totalMismatchTickets) {
    $unexplained = $totalMismatchTickets - $theoreticalDiff;
    echo PHP_EOL . "⚠ CÓ SỰ CHÊNH LỆCH!" . PHP_EOL;
    echo "Số tiền không giải thích được: " . number_format($unexplained, 0, ',', '.') . ' đ' . PHP_EOL;
    echo "Nguyên nhân có thể là:" . PHP_EOL;
    echo "- Có vé không match nhưng đã được thanh toán đúng người" . PHP_EOL;
    echo "- Có vé match nhưng chưa được thanh toán" . PHP_EOL;
    echo "- Có điều chỉnh payment thủ công" . PHP_EOL;
}
