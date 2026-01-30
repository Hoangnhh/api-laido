<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== PHÂN TÍCH SÂU DỮ LIỆU DATABASE ===" . PHP_EOL . PHP_EOL;

// 1. Kiểm tra tổng quan
echo "1. TỔNG QUAN" . PHP_EOL;

$overview = DB::select("
    SELECT
        (SELECT COUNT(*) FROM staff) as total_staff,
        (SELECT COUNT(*) FROM checked_ticket WHERE paid = 1 AND date >= ? AND date <= ?) as total_paid_tickets,
        (SELECT COUNT(*) FROM payment WHERE status = 'ACTIVE' AND date >= ? AND date <= ?) as total_payments,
        (SELECT SUM(commission) FROM checked_ticket WHERE paid = 1 AND date >= ? AND date <= ?) as total_commission,
        (SELECT SUM(amount) FROM payment WHERE status = 'ACTIVE' AND date >= ? AND date <= ?) as total_payment_amount
", [$fromDate, $toDate, $fromDate, $toDate, $fromDate, $toDate, $fromDate, $toDate]);

echo "- Tổng số nhân viên: " . number_format($overview[0]->total_staff) . PHP_EOL;
echo "- Tổng vé đã thanh toán (paid=1): " . number_format($overview[0]->total_paid_tickets) . " vé" . PHP_EOL;
echo "- Tổng số payment records: " . number_format($overview[0]->total_payments) . " records" . PHP_EOL;
echo "- Tổng commission vé: " . number_format($overview[0]->total_commission, 0, ',', '.') . ' đ' . PHP_EOL;
echo "- Tổng payment amount: " . number_format($overview[0]->total_payment_amount, 0, ',', '.') . ' đ' . PHP_EOL;
echo "- Chênh lệch (Commission - Payment): " . number_format($overview[0]->total_commission - $overview[0]->total_payment_amount, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 2. Phân tích payment theo nhân viên
echo "2. SO SÁNH PAYMENT vs COMMISSION THEO NHÂN VIÊN" . PHP_EOL;

$staffComparison = DB::select("
    SELECT
        s.id,
        s.code,
        s.name,
        s.username,
        COALESCE(p.total_payment, 0) as total_payment,
        COALESCE(ct.total_commission, 0) as total_commission,
        COALESCE(ct.ticket_count, 0) as ticket_count,
        (COALESCE(p.total_payment, 0) - COALESCE(ct.total_commission, 0)) as difference
    FROM staff s
    LEFT JOIN (
        SELECT staff_id, SUM(amount) as total_payment
        FROM payment
        WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
        GROUP BY staff_id
    ) p ON s.id = p.staff_id
    LEFT JOIN (
        SELECT staff_id, SUM(commission) as total_commission, COUNT(DISTINCT code) as ticket_count
        FROM checked_ticket
        WHERE paid = 1 AND date >= ? AND date <= ?
        GROUP BY staff_id
    ) ct ON s.id = ct.staff_id
    WHERE COALESCE(p.total_payment, 0) != COALESCE(ct.total_commission, 0)
    ORDER BY ABS(COALESCE(p.total_payment, 0) - COALESCE(ct.total_commission, 0)) DESC
    LIMIT 20
", [$fromDate, $toDate, $fromDate, $toDate]);

if (count($staffComparison) > 0) {
    echo "Top 20 nhân viên có chênh lệch Payment vs Commission:" . PHP_EOL;
    echo str_pad('Mã NV', 10) . ' | ' .
         str_pad('Tên NV', 25) . ' | ' .
         str_pad('Payment', 15) . ' | ' .
         str_pad('Commission', 15) . ' | ' .
         str_pad('Vé', 8) . ' | ' .
         str_pad('Chênh lệch', 15) . PHP_EOL;
    echo str_repeat('-', 110) . PHP_EOL;

    $totalDiff = 0;
    foreach ($staffComparison as $staff) {
        echo str_pad($staff->code, 10) . ' | ' .
             str_pad(substr($staff->name, 0, 25), 25) . ' | ' .
             str_pad(number_format($staff->total_payment, 0, ',', '.'), 15) . ' | ' .
             str_pad(number_format($staff->total_commission, 0, ',', '.'), 15) . ' | ' .
             str_pad(number_format($staff->ticket_count), 8) . ' | ' .
             str_pad(number_format($staff->difference, 0, ',', '.'), 15) . PHP_EOL;
        $totalDiff += $staff->difference;
    }
    echo str_repeat('-', 110) . PHP_EOL;
    echo "Tổng chênh lệch (top 20): " . number_format($totalDiff, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;
} else {
    echo "✓ Không có nhân viên nào có chênh lệch!" . PHP_EOL . PHP_EOL;
}

// 3. Kiểm tra vé có checkin_by khác username
echo "3. VÉ CÓ CHECKIN_BY KHÁC USERNAME" . PHP_EOL;

$mismatchDetails = DB::select("
    SELECT
        s.code,
        s.name,
        s.username,
        ct.checkin_by,
        COUNT(DISTINCT ct.code) as ticket_count,
        SUM(ct.commission) as total_commission
    FROM checked_ticket ct
    JOIN staff s ON ct.staff_id = s.id
    WHERE ct.paid = 1
        AND ct.date >= ?
        AND ct.date <= ?
        AND ct.checkin_by != s.username
    GROUP BY s.code, s.name, s.username, ct.checkin_by
    ORDER BY total_commission DESC
", [$fromDate, $toDate]);

if (count($mismatchDetails) > 0) {
    echo str_pad('Mã NV', 10) . ' | ' .
         str_pad('Username', 15) . ' | ' .
         str_pad('Checkin by', 15) . ' | ' .
         str_pad('Số vé', 8) . ' | ' .
         str_pad('Tổng tiền', 15) . PHP_EOL;
    echo str_repeat('-', 80) . PHP_EOL;

    $totalMismatch = 0;
    foreach ($mismatchDetails as $detail) {
        echo str_pad($detail->code, 10) . ' | ' .
             str_pad($detail->username, 15) . ' | ' .
             str_pad($detail->checkin_by, 15) . ' | ' .
             str_pad(number_format($detail->ticket_count), 8) . ' | ' .
             str_pad(number_format($detail->total_commission, 0, ',', '.'), 15) . PHP_EOL;
        $totalMismatch += $detail->total_commission;
    }
    echo str_repeat('-', 80) . PHP_EOL;
    echo "Tổng: " . number_format($totalMismatch, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;
} else {
    echo "✓ Không có vé nào có checkin_by khác username!" . PHP_EOL . PHP_EOL;
}

// 4. Tìm nhân viên được thanh toán nhưng không có vé match
echo "4. NHÂN VIÊN ĐƯỢC THANH TOÁN NHƯNG KHÔNG CÓ VÉ MATCH" . PHP_EOL;

$overpaid = DB::select("
    SELECT
        s.code,
        s.name,
        s.username,
        p.total_payment,
        COALESCE(ct_match.total_commission, 0) as match_commission,
        COALESCE(ct_match.ticket_count, 0) as match_tickets,
        (p.total_payment - COALESCE(ct_match.total_commission, 0)) as overpaid
    FROM staff s
    JOIN (
        SELECT staff_id, SUM(amount) as total_payment
        FROM payment
        WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
        GROUP BY staff_id
    ) p ON s.id = p.staff_id
    LEFT JOIN (
        SELECT ct.staff_id, SUM(ct.commission) as total_commission, COUNT(DISTINCT ct.code) as ticket_count
        FROM checked_ticket ct
        JOIN staff s ON ct.staff_id = s.id
        WHERE ct.paid = 1
            AND ct.date >= ? AND ct.date <= ?
            AND ct.checkin_by = s.username
        GROUP BY ct.staff_id
    ) ct_match ON s.id = ct_match.staff_id
    WHERE p.total_payment > COALESCE(ct_match.total_commission, 0)
    ORDER BY (p.total_payment - COALESCE(ct_match.total_commission, 0)) DESC
    LIMIT 10
", [$fromDate, $toDate, $fromDate, $toDate]);

if (count($overpaid) > 0) {
    echo str_pad('Mã NV', 10) . ' | ' .
         str_pad('Tên NV', 20) . ' | ' .
         str_pad('Đã thanh toán', 15) . ' | ' .
         str_pad('Vé match', 15) . ' | ' .
         str_pad('Thừa', 15) . PHP_EOL;
    echo str_repeat('-', 90) . PHP_EOL;

    $totalOverpaid = 0;
    foreach ($overpaid as $staff) {
        echo str_pad($staff->code, 10) . ' | ' .
             str_pad(substr($staff->name, 0, 20), 20) . ' | ' .
             str_pad(number_format($staff->total_payment, 0, ',', '.'), 15) . ' | ' .
             str_pad(number_format($staff->match_commission, 0, ',', '.'), 15) . ' | ' .
             str_pad(number_format($staff->overpaid, 0, ',', '.'), 15) . PHP_EOL;
        $totalOverpaid += $staff->overpaid;
    }
    echo str_repeat('-', 90) . PHP_EOL;
    echo "Tổng thanh toán thừa: " . number_format($totalOverpaid, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;
}

// 5. Tìm nhân viên check-in vé nhưng chưa được thanh toán
echo "5. USERNAME CHECK-IN NHƯNG CHƯA ĐƯỢC THANH TOÁN" . PHP_EOL;

$unpaidCheckins = DB::select("
    SELECT
        ct.checkin_by,
        COUNT(DISTINCT ct.code) as ticket_count,
        SUM(ct.commission) as total_commission,
        CASE
            WHEN s.id IS NOT NULL THEN CONCAT('NV: ', s.code, ' - ', s.name)
            ELSE 'KHÔNG CÓ TRONG STAFF'
        END as staff_info
    FROM checked_ticket ct
    LEFT JOIN staff s ON ct.checkin_by = s.username
    WHERE ct.paid = 1
        AND ct.date >= ?
        AND ct.date <= ?
        AND NOT EXISTS (
            SELECT 1
            FROM staff s2
            WHERE s2.id = ct.staff_id
                AND s2.username = ct.checkin_by
        )
    GROUP BY ct.checkin_by, s.id, s.code, s.name
    ORDER BY total_commission DESC
", [$fromDate, $toDate]);

if (count($unpaidCheckins) > 0) {
    echo str_pad('Username', 15) . ' | ' .
         str_pad('Số vé', 10) . ' | ' .
         str_pad('Tổng tiền', 15) . ' | ' .
         'Ghi chú' . PHP_EOL;
    echo str_repeat('-', 80) . PHP_EOL;

    $totalUnpaid = 0;
    foreach ($unpaidCheckins as $checkin) {
        echo str_pad($checkin->checkin_by, 15) . ' | ' .
             str_pad(number_format($checkin->ticket_count), 10) . ' | ' .
             str_pad(number_format($checkin->total_commission, 0, ',', '.'), 15) . ' | ' .
             $checkin->staff_info . PHP_EOL;
        $totalUnpaid += $checkin->total_commission;
    }
    echo str_repeat('-', 80) . PHP_EOL;
    echo "Tổng chưa thanh toán: " . number_format($totalUnpaid, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;
}

// 6. Kết luận
echo "6. KẾT LUẬN" . PHP_EOL;
$finalDiff = $overview[0]->total_payment_amount - $overview[0]->total_commission;
echo "- Tổng payment: " . number_format($overview[0]->total_payment_amount, 0, ',', '.') . ' đ' . PHP_EOL;
echo "- Tổng commission: " . number_format($overview[0]->total_commission, 0, ',', '.') . ' đ' . PHP_EOL;
echo "- Chênh lệch tổng: " . number_format($finalDiff, 0, ',', '.') . ' đ' . PHP_EOL;

if (abs($finalDiff) <= 100000) {
    echo "✓ Chênh lệch RẤT NHỎ (dưới 100k)" . PHP_EOL;
} elseif (abs($finalDiff) <= 1000000) {
    echo "✓ Chênh lệch NHỎ (dưới 1 triệu)" . PHP_EOL;
} else {
    echo "⚠ Chênh lệch LỚN (trên 1 triệu)" . PHP_EOL;
}
