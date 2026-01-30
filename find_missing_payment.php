<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== TÌM VÉ THIẾU PAYMENT 161.000 đ ===" . PHP_EOL . PHP_EOL;

// 1. Tính commission và payment cho từng nhân viên
echo "1. SO SÁNH COMMISSION vs PAYMENT THEO NHÂN VIÊN" . PHP_EOL . PHP_EOL;

$staffAnalysis = DB::select("
    SELECT
        s.id,
        s.code,
        s.name,
        s.username,
        COALESCE(ct_all.total_commission, 0) as total_commission,
        COALESCE(ct_all.ticket_count, 0) as ticket_count,
        COALESCE(p.total_payment, 0) as total_payment,
        (COALESCE(ct_all.total_commission, 0) - COALESCE(p.total_payment, 0)) as difference
    FROM staff s
    LEFT JOIN (
        SELECT staff_id, SUM(commission) as total_commission, COUNT(DISTINCT code) as ticket_count
        FROM checked_ticket
        WHERE paid = 1 AND date >= ? AND date <= ?
        GROUP BY staff_id
    ) ct_all ON s.id = ct_all.staff_id
    LEFT JOIN (
        SELECT staff_id, SUM(amount) as total_payment
        FROM payment
        WHERE status = 'ACTIVE' AND date >= ? AND date <= ?
        GROUP BY staff_id
    ) p ON s.id = p.staff_id
    HAVING difference > 0
    ORDER BY difference DESC
", [$fromDate, $toDate, $fromDate, $toDate]);

echo str_pad('Mã NV', 10) . ' | ' .
     str_pad('Tên NV', 25) . ' | ' .
     str_pad('Commission', 15) . ' | ' .
     str_pad('Payment', 15) . ' | ' .
     str_pad('Thiếu', 15) . PHP_EOL;
echo str_repeat('-', 95) . PHP_EOL;

$totalMissing = 0;
foreach ($staffAnalysis as $staff) {
    if ($staff->difference > 0) {
        echo str_pad($staff->code, 10) . ' | ' .
             str_pad(substr($staff->name, 0, 25), 25) . ' | ' .
             str_pad(number_format($staff->total_commission, 0, ',', '.'), 15) . ' | ' .
             str_pad(number_format($staff->total_payment, 0, ',', '.'), 15) . ' | ' .
             str_pad(number_format($staff->difference, 0, ',', '.'), 15) . PHP_EOL;
        $totalMissing += $staff->difference;
    }
}
echo str_repeat('-', 95) . PHP_EOL;
echo "TỔNG THIẾU: " . number_format($totalMissing, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// 2. Tìm nhân viên có thiếu chính xác hoặc gần 161.000 đ
echo "2. NHÂN VIÊN CÓ SỐ TIỀN THIẾU GẦN 161.000 đ" . PHP_EOL . PHP_EOL;

$target = 161000;
$tolerance = 50000; // Chênh lệch cho phép

foreach ($staffAnalysis as $staff) {
    if (abs($staff->difference - $target) <= $tolerance) {
        echo "FOUND: NV {$staff->code} - {$staff->name}" . PHP_EOL;
        echo "- Commission: " . number_format($staff->total_commission, 0, ',', '.') . ' đ' . PHP_EOL;
        echo "- Payment: " . number_format($staff->total_payment, 0, ',', '.') . ' đ' . PHP_EOL;
        echo "- Thiếu: " . number_format($staff->difference, 0, ',', '.') . ' đ' . PHP_EOL;
        echo "- Số vé: " . number_format($staff->ticket_count) . PHP_EOL . PHP_EOL;

        // Lấy chi tiết vé của nhân viên này
        $tickets = DB::table('checked_ticket')
            ->where('staff_id', $staff->id)
            ->where('paid', 1)
            ->where('date', '>=', $fromDate)
            ->where('date', '<=', $toDate)
            ->select('code', 'name', 'commission', 'date', 'checkin_by', 'checkout_by')
            ->orderBy('date')
            ->get();

        if ($tickets->count() <= 20) {
            echo "  Chi tiết vé:" . PHP_EOL;
            foreach ($tickets as $ticket) {
                echo "  - Vé {$ticket->code}: {$ticket->name}, " .
                     number_format($ticket->commission) . " đ, " .
                     "ngày {$ticket->date}" . PHP_EOL;
            }
        } else {
            echo "  (Nhân viên này có {$tickets->count()} vé)" . PHP_EOL;
        }
        echo PHP_EOL;
    }
}

// 3. Kiểm tra xem có tổ hợp nào của nhiều nhân viên
echo "3. PHÂN TÍCH TỔ HỢP" . PHP_EOL . PHP_EOL;

$smallDifferences = [];
foreach ($staffAnalysis as $staff) {
    if ($staff->difference > 0 && $staff->difference <= 100000) {
        $smallDifferences[] = [
            'code' => $staff->code,
            'name' => $staff->name,
            'diff' => $staff->difference
        ];
    }
}

if (count($smallDifferences) > 0) {
    echo "Các nhân viên có thiếu < 100k:" . PHP_EOL;
    foreach ($smallDifferences as $s) {
        echo "- NV {$s['code']}: " . number_format($s['diff'], 0, ',', '.') . ' đ' . PHP_EOL;
    }
    echo PHP_EOL;

    // Tìm tổ hợp 2 nhân viên
    for ($i = 0; $i < count($smallDifferences); $i++) {
        for ($j = $i + 1; $j < count($smallDifferences); $j++) {
            $sum = $smallDifferences[$i]['diff'] + $smallDifferences[$j]['diff'];
            if (abs($sum - 161000) <= 10000) {
                echo "TỔ HỢP: NV {$smallDifferences[$i]['code']} + NV {$smallDifferences[$j]['code']}" . PHP_EOL;
                echo "  = " . number_format($smallDifferences[$i]['diff'], 0, ',', '.') .
                     " + " . number_format($smallDifferences[$j]['diff'], 0, ',', '.') .
                     " = " . number_format($sum, 0, ',', '.') . ' đ' . PHP_EOL;
            }
        }
    }
}

// 4. Chi tiết payment của các nhân viên có thiếu
echo PHP_EOL . "4. CHI TIẾT TOP 5 NHÂN VIÊN THIẾU NHIỀU NHẤT" . PHP_EOL . PHP_EOL;

$top5 = array_slice($staffAnalysis, 0, 5);
foreach ($top5 as $staff) {
    echo "NV {$staff->code} - {$staff->name}:" . PHP_EOL;
    echo "- Tổng commission: " . number_format($staff->total_commission, 0, ',', '.') . ' đ (' .
         number_format($staff->ticket_count) . ' vé)' . PHP_EOL;

    $payments = DB::table('payment')
        ->where('staff_id', $staff->id)
        ->where('status', 'ACTIVE')
        ->where('date', '>=', $fromDate)
        ->where('date', '<=', $toDate)
        ->select('date', 'amount', 'transaction_code')
        ->orderBy('date')
        ->get();

    if ($payments->count() > 0) {
        echo "- Số lần thanh toán: " . $payments->count() . PHP_EOL;
        echo "- Tổng đã thanh toán: " . number_format($staff->total_payment, 0, ',', '.') . ' đ' . PHP_EOL;
        foreach ($payments as $p) {
            echo "  + " . $p->date . ": " . number_format($p->amount, 0, ',', '.') .
                 " đ (#{$p->transaction_code})" . PHP_EOL;
        }
    } else {
        echo "- CHƯA CÓ PAYMENT NÀO!" . PHP_EOL;
    }
    echo "- Còn thiếu: " . number_format($staff->difference, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;
}
