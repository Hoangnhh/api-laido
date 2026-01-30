<?php

require __DIR__."/vendor/autoload.php";
$app = require_once __DIR__."/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

use Illuminate\Support\Facades\DB;

$fromDate = "2025-01-01";
$toDate = "2026-01-25";

$sql = "
    SELECT 
        ct.code as ticket_code,
        ct.name as ticket_name,
        ct.commission,
        ct.date,
        ct.checkin_by,
        ct.checkout_by,
        s.code as staff_code,
        s.name as staff_name,
        s.username as staff_username
    FROM checked_ticket ct
    INNER JOIN staff s ON ct.staff_id = s.id
    WHERE ct.date >= ?
      AND ct.date <= ?
      AND ct.paid = 1
      AND ct.checkin_by != s.username
    ORDER BY s.code, ct.date DESC
";

$tickets = DB::select($sql, [$fromDate, $toDate]);

$filename = "/tmp/ve_khong_khop.csv";
$fp = fopen($filename, "w");

// Header with BOM for Excel UTF-8 support
fputs($fp, "\xEF\xBB\xBF");

// CSV Header
fputcsv($fp, [
    "STT",
    "Mã vé",
    "Loại vé",
    "Ngày",
    "Commission",
    "Mã NV được gán",
    "Tên NV được gán",
    "Username NV (đúng)",
    "Checkin by (sai)",
    "Checkout by"
]);

$stt = 1;
foreach ($tickets as $ticket) {
    fputcsv($fp, [
        $stt++,
        $ticket->ticket_code,
        $ticket->ticket_name,
        $ticket->date,
        $ticket->commission,
        $ticket->staff_code,
        $ticket->staff_name,
        $ticket->staff_username,
        $ticket->checkin_by ?? "",
        $ticket->checkout_by ?? ""
    ]);
}

fclose($fp);

echo "Đã tạo file CSV: " . $filename . PHP_EOL;
echo "Tổng số vé: " . count($tickets) . PHP_EOL;
