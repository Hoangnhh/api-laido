<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== CHI TIẾT VẤN ĐỀ CÒN LẠI ===" . PHP_EOL . PHP_EOL;

// Lấy thông tin nhân viên 1730
$staff = DB::table('staff')->where('code', '1730')->first();
echo "Thông tin nhân viên:" . PHP_EOL;
echo "- Mã NV: " . $staff->code . PHP_EOL;
echo "- Tên: " . $staff->name . PHP_EOL;
echo "- Username: " . $staff->username . PHP_EOL;
echo "- ID: " . $staff->id . PHP_EOL . PHP_EOL;

// Kiểm tra username 0328059633 có trong staff không
$checkinUser = DB::table('staff')->where('username', '0328059633')->first();
if ($checkinUser) {
    echo "Username 0328059633 TÌM THẤY trong staff:" . PHP_EOL;
    echo "- Mã NV: " . $checkinUser->code . PHP_EOL;
    echo "- Tên: " . $checkinUser->name . PHP_EOL;
    echo "- ID: " . $checkinUser->id . PHP_EOL . PHP_EOL;
} else {
    echo "Username 0328059633 KHÔNG TÌM THẤY trong staff" . PHP_EOL . PHP_EOL;
}

// Lấy danh sách 6 vé lỗi
echo "=== DANH SÁCH 6 VÉ CÒN LẠI ===" . PHP_EOL;
$tickets = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->where('s.code', '1730')
    ->whereRaw('ct.checkin_by != s.username')
    ->select('ct.code', 'ct.name', 'ct.commission', 'ct.date', 'ct.checkin_by', 'ct.staff_id')
    ->get();

if ($tickets->count() > 0) {
    echo str_pad('Mã vé', 15) . ' | ' .
         str_pad('Loại vé', 30) . ' | ' .
         str_pad('Commission', 12) . ' | ' .
         str_pad('Ngày', 12) . ' | ' .
         'Checkin by' . PHP_EOL;
    echo str_repeat('-', 100) . PHP_EOL;

    $total = 0;
    foreach ($tickets as $ticket) {
        echo str_pad($ticket->code, 15) . ' | ' .
             str_pad($ticket->name, 30) . ' | ' .
             str_pad(number_format($ticket->commission, 0, ',', '.'), 12) . ' | ' .
             str_pad($ticket->date, 12) . ' | ' .
             $ticket->checkin_by . PHP_EOL;
        $total += $ticket->commission;
    }
    echo str_repeat('-', 100) . PHP_EOL;
    echo "TỔNG: " . number_format($total, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;
}

// Kiểm tra payment của nhân viên 1730
echo "=== PAYMENT CỦA NHÂN VIÊN 1730 ===" . PHP_EOL;
$payments = DB::table('payment')
    ->where('staff_id', $staff->id)
    ->where('status', 'ACTIVE')
    ->whereDate('date', '>=', $fromDate)
    ->whereDate('date', '<=', $toDate)
    ->select('date', 'amount', 'transaction_code')
    ->get();

$totalPaid = 0;
foreach ($payments as $payment) {
    echo "- Ngày: " . $payment->date . ", Số tiền: " . number_format($payment->amount, 0, ',', '.') . ' đ, Mã GD: ' . $payment->transaction_code . PHP_EOL;
    $totalPaid += $payment->amount;
}
echo "Tổng đã thanh toán: " . number_format($totalPaid, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// Tính commission ĐÚNG của nhân viên 1730
echo "=== COMMISSION ĐÚNG CỦA NHÂN VIÊN 1730 ===" . PHP_EOL;
$correctCommission = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->where('s.code', '1730')
    ->whereRaw('ct.checkin_by = s.username')
    ->select(
        DB::raw('COUNT(DISTINCT ct.code) as ticket_count'),
        DB::raw('SUM(ct.commission) as total_commission')
    )
    ->first();

echo "- Số vé ĐÚNG (checkin_by = username): " . number_format($correctCommission->ticket_count) . " vé" . PHP_EOL;
echo "- Tổng commission ĐÚNG: " . number_format($correctCommission->total_commission ?? 0, 0, ',', '.') . ' đ' . PHP_EOL;
echo "- Vé SAI: 6 vé" . PHP_EOL;
echo "- Commission SAI: 210.000 đ" . PHP_EOL . PHP_EOL;

echo "=== PHÂN TÍCH ===" . PHP_EOL;
echo "Nếu trừ commission SAI khỏi payment:" . PHP_EOL;
echo "  " . number_format($totalPaid, 0, ',', '.') . " đ - 210.000 đ = " . number_format($totalPaid - 210000, 0, ',', '.') . ' đ' . PHP_EOL;
echo "So với commission ĐÚNG: " . number_format($correctCommission->total_commission ?? 0, 0, ',', '.') . ' đ' . PHP_EOL;
$diff = ($totalPaid - 210000) - ($correctCommission->total_commission ?? 0);
echo "Chênh lệch: " . number_format($diff, 0, ',', '.') . ' đ' . PHP_EOL;
