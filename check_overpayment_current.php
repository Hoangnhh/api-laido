<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = '2025-01-01';
$toDate = '2026-01-25';

echo "=== PHÂN TÍCH NHÂN VIÊN BỊ THANH TOÁN THỪA (CẬP NHẬT) ===" . PHP_EOL . PHP_EOL;

// Lấy danh sách vé không match (checkin_by != username)
$mismatchTickets = DB::table('checked_ticket as ct')
    ->join('staff as s', 'ct.staff_id', '=', 's.id')
    ->where('ct.paid', 1)
    ->where('ct.date', '>=', $fromDate)
    ->where('ct.date', '<=', $toDate)
    ->whereRaw('ct.checkin_by != s.username')
    ->select(
        's.id as staff_id',
        's.code as staff_code',
        's.name as staff_name',
        's.username as staff_username',
        'ct.checkin_by',
        'ct.commission',
        'ct.code as ticket_code'
    )
    ->get();

// Group by staff
$staffMismatch = [];
foreach ($mismatchTickets as $ticket) {
    $staffId = $ticket->staff_id;
    if (!isset($staffMismatch[$staffId])) {
        $staffMismatch[$staffId] = [
            'code' => $ticket->staff_code,
            'name' => $ticket->staff_name,
            'username' => $ticket->staff_username,
            'count' => 0,
            'total' => 0,
            'tickets' => []
        ];
    }
    $staffMismatch[$staffId]['count']++;
    $staffMismatch[$staffId]['total'] += $ticket->commission;
    $staffMismatch[$staffId]['tickets'][] = $ticket;
}

// Lấy tổng tiền đã thanh toán cho từng nhân viên
foreach ($staffMismatch as $staffId => $info) {
    $paid = DB::table('payment')
        ->where('staff_id', $staffId)
        ->where('status', 'ACTIVE')
        ->whereDate('date', '>=', $fromDate)
        ->whereDate('date', '<=', $toDate)
        ->sum('amount');
    $staffMismatch[$staffId]['paid'] = $paid;

    // Tính số vé ĐÚNG (checkin_by = username)
    $correctTickets = DB::table('checked_ticket as ct')
        ->join('staff as s', 'ct.staff_id', '=', 's.id')
        ->where('s.id', $staffId)
        ->where('ct.paid', 1)
        ->where('ct.date', '>=', $fromDate)
        ->where('ct.date', '<=', $toDate)
        ->whereRaw('ct.checkin_by = s.username')
        ->select(
            DB::raw('COUNT(DISTINCT ct.code) as count'),
            DB::raw('SUM(ct.commission) as total')
        )
        ->first();

    $staffMismatch[$staffId]['correct_count'] = $correctTickets->count ?? 0;
    $staffMismatch[$staffId]['correct_total'] = $correctTickets->total ?? 0;
    $staffMismatch[$staffId]['overpaid'] = $staffMismatch[$staffId]['total'];
}

// Sort by overpaid amount
uasort($staffMismatch, function($a, $b) {
    return $b['overpaid'] - $a['overpaid'];
});

echo str_pad('Mã NV', 8) . ' | ' .
     str_pad('Tên NV', 20) . ' | ' .
     str_pad('Vé SAI', 8) . ' | ' .
     str_pad('Tiền SAI', 15) . ' | ' .
     str_pad('Vé ĐÚNG', 8) . ' | ' .
     str_pad('Tiền ĐÚNG', 15) . ' | ' .
     str_pad('Đã thanh toán', 15) . ' | ' .
     str_pad('Chênh lệch', 15) . PHP_EOL;
echo str_repeat('-', 130) . PHP_EOL;

$totalOverpaid = 0;
foreach ($staffMismatch as $info) {
    echo str_pad($info['code'], 8) . ' | ' .
         str_pad($info['name'], 20) . ' | ' .
         str_pad(number_format($info['count']), 8) . ' | ' .
         str_pad(number_format($info['total'], 0, ',', '.'), 15) . ' | ' .
         str_pad(number_format($info['correct_count']), 8) . ' | ' .
         str_pad(number_format($info['correct_total'], 0, ',', '.'), 15) . ' | ' .
         str_pad(number_format($info['paid'], 0, ',', '.'), 15) . ' | ' .
         str_pad(number_format($info['overpaid'], 0, ',', '.'), 15) . PHP_EOL;
    $totalOverpaid += $info['overpaid'];
}

echo str_repeat('-', 130) . PHP_EOL;
echo "TỔNG CỘNG: " . number_format($totalOverpaid, 0, ',', '.') . ' đ' . PHP_EOL . PHP_EOL;

// Kiểm tra username check-in không có trong staff
echo "=== NHÂN VIÊN CHECK-IN NHƯNG KHÔNG ĐƯỢC THANH TOÁN ===" . PHP_EOL . PHP_EOL;

$checkinUsers = [];
foreach ($mismatchTickets as $ticket) {
    $checkinBy = $ticket->checkin_by;
    if (!isset($checkinUsers[$checkinBy])) {
        $checkinUsers[$checkinBy] = [
            'count' => 0,
            'total' => 0
        ];
    }
    $checkinUsers[$checkinBy]['count']++;
    $checkinUsers[$checkinBy]['total'] += $ticket->commission;
}

// Sort by total desc
uasort($checkinUsers, function($a, $b) {
    return $b['total'] - $a['total'];
});

echo str_pad('Username check-in', 20) . ' | ' .
     str_pad('Số vé', 10) . ' | ' .
     str_pad('Tổng tiền', 15) . ' | ' .
     'Ghi chú' . PHP_EOL;
echo str_repeat('-', 80) . PHP_EOL;

foreach ($checkinUsers as $username => $info) {
    // Kiểm tra username có trong staff không
    $staffExists = DB::table('staff')->where('username', $username)->exists();
    $note = $staffExists ? 'Có trong staff' : 'Không tìm thấy NV';

    echo str_pad($username, 20) . ' | ' .
         str_pad(number_format($info['count']), 10) . ' | ' .
         str_pad(number_format($info['total'], 0, ',', '.'), 15) . ' | ' .
         $note . PHP_EOL;
}
