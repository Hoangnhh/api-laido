<?php

require __DIR__."/vendor/autoload.php";
$app = require_once __DIR__."/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = "2025-01-01";
$toDate = "2026-01-25";

echo "=== SO SÁNH TỔNG TIỀN GIỮA HAI NGUỒN ===" . PHP_EOL . PHP_EOL;

// 1. Tổng từ Payment table
$totalPayment = DB::table("payment")
    ->where("status", "ACTIVE")
    ->sum("amount");
echo "Tổng từ bảng PAYMENT: " . number_format($totalPayment, 0, ",", ".") . " đ" . PHP_EOL;

// 2. Tổng commission từ checked_ticket (logic như Report)
$fromDateParsed = $fromDate;
$toDateParsed = $toDate;

$sql = "
    SELECT
        SUM(ct.commission) as total_amount
    FROM checked_ticket ct
    INNER JOIN staff s ON ct.staff_id = s.id
    WHERE ct.date >= ?
      AND ct.date <= ?
      AND ct.checkin_by = s.username
";

$totalReport = DB::select($sql, [$fromDateParsed, $toDateParsed])[0]->total_amount ?? 0;
echo "Tổng từ CHECKED_TICKET (báo cáo lái đò): " . number_format($totalReport, 0, ",", ".") . " đ" . PHP_EOL;

$difference = $totalPayment - $totalReport;
echo "Chênh lệch: " . number_format($difference, 0, ",", ".") . " đ" . PHP_EOL . PHP_EOL;

// 3. Kiểm tra tổng commission TẤT CẢ vé
$totalAllTickets = DB::table("checked_ticket")
    ->whereDate("date", ">=", $fromDate)
    ->whereDate("date", "<=", $toDate)
    ->sum("commission");
echo "Tổng commission TẤT CẢ vé (không lọc): " . number_format($totalAllTickets, 0, ",", ".") . " đ" . PHP_EOL;

// 4. Kiểm tra tổng commission của các vé ĐÃ THANH TOÁN
$totalPaidTickets = DB::table("checked_ticket")
    ->where("paid", 1)
    ->sum("commission");
echo "Tổng commission các vé ĐÃ THANH TOÁN: " . number_format($totalPaidTickets, 0, ",", ".") . " đ" . PHP_EOL . PHP_EOL;

// 5. Chi tiết vé có commission nhưng không match điều kiện report
echo "=== TÌM VÉ CÓ COMMISSION NHƯNG KHÔNG MATCH ĐIỀU KIỆN REPORT ===" . PHP_EOL;
$sql2 = "
    SELECT 
        ct.code,
        ct.name,
        ct.commission,
        ct.checkin_by,
        ct.checkout_by,
        s.username as staff_username,
        ct.date
    FROM checked_ticket ct
    INNER JOIN staff s ON ct.staff_id = s.id
    WHERE ct.date >= ?
      AND ct.date <= ?
      AND ct.paid = 1
      AND ct.checkin_by != s.username
    LIMIT 50
";

$unmatchedTickets = DB::select($sql2, [$fromDateParsed, $toDateParsed]);
$unmatchedSum = 0;

if (count($unmatchedTickets) > 0) {
    echo "Tìm thấy " . count($unmatchedTickets) . " vé không match điều kiện (hiển thị 50 đầu):" . PHP_EOL;
    echo str_pad("Mã vé", 15) . " | " . str_pad("Loại vé", 30) . " | " . str_pad("Commission", 15) . " | " . str_pad("Checkin by", 20) . " | Staff username" . PHP_EOL;
    echo str_repeat("-", 120) . PHP_EOL;
    
    foreach ($unmatchedTickets as $ticket) {
        echo str_pad($ticket->code, 15) . " | " .
             str_pad(substr($ticket->name, 0, 30), 30) . " | " .
             str_pad(number_format($ticket->commission, 0, ",", "."), 15) . " | " .
             str_pad($ticket->checkin_by ?? "NULL", 20) . " | " .
             ($ticket->staff_username ?? "NULL") . PHP_EOL;
        $unmatchedSum += $ticket->commission;
    }
    
    echo PHP_EOL . "Tổng commission của 50 vé trên: " . number_format($unmatchedSum, 0, ",", ".") . " đ" . PHP_EOL;
    
    // Đếm tổng số vé không match
    $sql3 = "
        SELECT COUNT(*) as count, SUM(ct.commission) as total
        FROM checked_ticket ct
        INNER JOIN staff s ON ct.staff_id = s.id
        WHERE ct.date >= ?
          AND ct.date <= ?
          AND ct.paid = 1
          AND ct.checkin_by != s.username
    ";
    $unmatchedTotal = DB::select($sql3, [$fromDateParsed, $toDateParsed])[0];
    echo "TỔNG TẤT CẢ vé không match: " . $unmatchedTotal->count . " vé, tổng tiền: " . number_format($unmatchedTotal->total ?? 0, 0, ",", ".") . " đ" . PHP_EOL;
    
} else {
    echo "Không tìm thấy vé nào không match điều kiện." . PHP_EOL;
}
