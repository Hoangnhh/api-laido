<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== TÌM CHÍNH XÁC CÁC VÉ THIẾU PAYMENT ===" . PHP_EOL . PHP_EOL;

$missingStaff = [
    ['code' => '2304', 'name' => 'Đồng Văn Đạo', 'missing' => 70000],
    ['code' => '202', 'name' => 'Phạm Văn Thắng', 'missing' => 56000],
    ['code' => '3420', 'name' => 'Trần Thị Vân Anh', 'missing' => 35000]
];

foreach ($missingStaff as $staffInfo) {
    echo "========================================" . PHP_EOL;
    echo "NHÂN VIÊN: {$staffInfo['code']} - {$staffInfo['name']}" . PHP_EOL;
    echo "SỐ TIỀN THIẾU: " . number_format($staffInfo['missing'], 0, ',', '.') . ' đ' . PHP_EOL;
    echo "========================================" . PHP_EOL . PHP_EOL;

    // Lấy thông tin staff
    $staff = DB::table('staff')->where('code', $staffInfo['code'])->first();

    if (!$staff) {
        echo "Không tìm thấy nhân viên!" . PHP_EOL . PHP_EOL;
        continue;
    }

    // Lấy tất cả vé của nhân viên
    $tickets = DB::table('checked_ticket')
        ->where('staff_id', $staff->id)
        ->where('paid', 1)
        ->where('date', '>=', $fromDate)
        ->where('date', '<=', $toDate)
        ->select('code', 'name', 'commission', 'date', 'checkin_by', 'checkout_by')
        ->orderBy('commission', 'desc')
        ->get();

    $totalCommission = 0;
    echo "TẤT CẢ VÉ CỦA NHÂN VIÊN:" . PHP_EOL;
    echo str_pad('Mã vé', 15) . ' | ' .
         str_pad('Loại vé', 30) . ' | ' .
         str_pad('Commission', 12) . ' | ' .
         'Ngày' . PHP_EOL;
    echo str_repeat('-', 80) . PHP_EOL;

    foreach ($tickets as $ticket) {
        echo str_pad($ticket->code, 15) . ' | ' .
             str_pad(substr($ticket->name, 0, 30), 30) . ' | ' .
             str_pad(number_format($ticket->commission, 0, ',', '.'), 12) . ' | ' .
             $ticket->date . PHP_EOL;
        $totalCommission += $ticket->commission;
    }
    echo str_repeat('-', 80) . PHP_EOL;
    echo "Tổng commission: " . number_format($totalCommission, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

    // Lấy tất cả payment của nhân viên
    $payments = DB::table('payment')
        ->where('staff_id', $staff->id)
        ->where('status', 'ACTIVE')
        ->where('date', '>=', $fromDate)
        ->where('date', '<=', $toDate)
        ->select('date', 'amount', 'transaction_code')
        ->orderBy('date')
        ->get();

    $totalPayment = 0;
    echo "CÁC LƯỢT THANH TOÁN:" . PHP_EOL;
    foreach ($payments as $payment) {
        echo "- {$payment->date}: " . number_format($payment->amount, 0, ',', '.') .
             " đ (Mã GD: {$payment->transaction_code})" . PHP_EOL;
        $totalPayment += $payment->amount;
    }
    echo "Tổng đã thanh toán: " . number_format($totalPayment, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

    // Tính toán
    $actualMissing = $totalCommission - $totalPayment;
    echo "TÍNH TOÁN:" . PHP_EOL;
    echo "- Commission: " . number_format($totalCommission, 0, ',', '.') . ' đ' . PHP_EOL;
    echo "- Đã thanh toán: " . number_format($totalPayment, 0, ',', '.') . ' đ' . PHP_EOL;
    echo "- Còn thiếu: " . number_format($actualMissing, 0, ',', '.') . ' đ' . PHP_EOL;

    if ($actualMissing == $staffInfo['missing']) {
        echo "✓ Khớp với số tiền thiếu!" . PHP_EOL;
    }

    // Tìm vé có commission = số tiền thiếu
    echo PHP_EOL . "VÉ CÓ COMMISSION ĐÚNG BẰNG SỐ TIỀN THIẾU:" . PHP_EOL;
    $matchingTickets = [];
    foreach ($tickets as $ticket) {
        if ($ticket->commission == $staffInfo['missing']) {
            echo "- Vé {$ticket->code}: {$ticket->name}, " .
                 number_format($ticket->commission, 0, ',', '.') . " đ, ngày {$ticket->date}" . PHP_EOL;
            $matchingTickets[] = $ticket;
        }
    }

    if (count($matchingTickets) == 0) {
        echo "(Không có vé đơn lẻ nào khớp số tiền)" . PHP_EOL;

        // Tìm tổ hợp 2 vé
        echo PHP_EOL . "TÌM TỔ HỢP 2 VÉ:" . PHP_EOL;
        $found = false;
        for ($i = 0; $i < count($tickets); $i++) {
            for ($j = $i + 1; $j < count($tickets); $j++) {
                if ($tickets[$i]->commission + $tickets[$j]->commission == $staffInfo['missing']) {
                    echo "- Vé {$tickets[$i]->code} (" . number_format($tickets[$i]->commission) . " đ) + " .
                         "Vé {$tickets[$j]->code} (" . number_format($tickets[$j]->commission) . " đ) = " .
                         number_format($staffInfo['missing']) . " đ" . PHP_EOL;
                    $found = true;
                }
            }
        }
        if (!$found) {
            echo "(Không tìm thấy tổ hợp 2 vé nào)" . PHP_EOL;
        }
    }

    echo PHP_EOL . PHP_EOL;
}

// Tổng kết
echo "========================================" . PHP_EOL;
echo "TỔNG KẾT" . PHP_EOL;
echo "========================================" . PHP_EOL;
echo "3 nhân viên thiếu payment:" . PHP_EOL;
$total = 0;
foreach ($missingStaff as $s) {
    echo "- {$s['code']} ({$s['name']}): " . number_format($s['missing'], 0, ',', '.') . ' đ' . PHP_EOL;
    $total += $s['missing'];
}
echo "TỔNG: " . number_format($total, 0, ',', '.') . ' đ' . PHP_EOL;
