<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== PHÂN TÍCH CHÊNH LỆCH PAYMENT ===" . PHP_EOL . PHP_EOL;

// Tổng tất cả payment
$totalAll = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->sum('amount');
echo 'Tổng tất cả payment (không giới hạn thời gian): ' . number_format($totalAll, 0, ',', '.') . ' đ' . PHP_EOL;

// Tổng payment trong khoảng thời gian
$totalInRange = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->whereDate('date', '>=', $fromDate)
    ->whereDate('date', '<=', $toDate)
    ->sum('amount');
echo 'Tổng payment từ ' . $fromDate . ' đến ' . $toDate . ': ' . number_format($totalInRange, 0, ',', '.') . ' đ' . PHP_EOL;

// Chênh lệch
$difference = $totalAll - $totalInRange;
echo 'Chênh lệch: ' . number_format($difference, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// Payment trước ngày 01/01/2025
$beforeRange = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->whereDate('date', '<', $fromDate)
    ->sum('amount');
echo 'Payment trước ' . $fromDate . ': ' . number_format($beforeRange, 0, ',', '.') . ' đ' . PHP_EOL;

$countBefore = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->whereDate('date', '<', $fromDate)
    ->count();
echo 'Số lượng payment trước ' . $fromDate . ': ' . $countBefore . ' giao dịch' . PHP_EOL . PHP_EOL;

// Payment sau ngày 25/01/2026
$afterRange = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->whereDate('date', '>' , $toDate)
    ->sum('amount');
echo 'Payment sau ' . $toDate . ': ' . number_format($afterRange, 0, ',', '.') . ' đ' . PHP_EOL;

$countAfter = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->whereDate('date', '>' , $toDate)
    ->count();
echo 'Số lượng payment sau ' . $toDate . ': ' . $countAfter . ' giao dịch' . PHP_EOL . PHP_EOL;

// Chi tiết payment ngoài khoảng thời gian
echo '=== CHI TIẾT CÁC PAYMENT NGOÀI KHOẢNG THỜI GIAN ===' . PHP_EOL;
$paymentsOutside = DB::table('payment')
    ->join('staff', 'payment.staff_id', '=', 'staff.id')
    ->where('payment.status', 'ACTIVE')
    ->where(function($q) use ($fromDate, $toDate) {
        $q->whereDate('payment.date', '<', $fromDate)
          ->orWhereDate('payment.date', '>' , $toDate);
    })
    ->select('payment.date', 'staff.code', 'staff.name', 'payment.amount', 'payment.transaction_code')
    ->orderBy('payment.date')
    ->get();

if ($paymentsOutside->count() > 0) {
    echo str_pad('Ngày', 15) . ' | ' . str_pad('Mã NV', 10) . ' | ' . str_pad('Tên NV', 25) . ' | ' . str_pad('Số tiền', 20) . ' | Mã GD' . PHP_EOL;
    echo str_repeat('-', 110) . PHP_EOL;

    foreach($paymentsOutside as $p) {
        echo str_pad($p->date, 15) . ' | ' .
             str_pad($p->code, 10) . ' | ' .
             str_pad($p->name, 25) . ' | ' .
             str_pad(number_format($p->amount, 0, ',', '.') . ' đ', 20) . ' | ' .
             $p->transaction_code . PHP_EOL;
    }
} else {
    echo 'Không có payment nào ngoài khoảng thời gian.' . PHP_EOL;
}

// Tìm khoảng thời gian sớm nhất và muộn nhất
echo PHP_EOL . '=== PHẠM VI THỜI GIAN CỦA TẤT CẢ PAYMENT ===' . PHP_EOL;
$dateRange = DB::table('payment')
    ->where('status', 'ACTIVE')
    ->selectRaw('MIN(date) as earliest, MAX(date) as latest')
    ->first();

echo 'Payment sớm nhất: ' . $dateRange->earliest . PHP_EOL;
echo 'Payment muộn nhất: ' . $dateRange->latest . PHP_EOL;
