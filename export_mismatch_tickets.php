<?php

require __DIR__."/vendor/autoload.php";
$app = require_once __DIR__."/bootstrap/app.php";
$app->make("Illuminate\Contracts\Console\Kernel")->bootstrap();

use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

$fromDate = "2025-01-01";
$toDate = "2026-01-25";

echo "Đang truy vấn dữ liệu..." . PHP_EOL;

// Lấy danh sách tất cả các vé không match điều kiện
$sql = "
    SELECT 
        ct.code as ticket_code,
        ct.name as ticket_name,
        ct.commission,
        ct.date,
        ct.checkin_by,
        ct.checkout_by,
        ct.checkin_at,
        ct.checkout_at,
        s.code as staff_code,
        s.name as staff_name,
        s.username as staff_username,
        ct.paid,
        p.transaction_code as payment_code,
        p.date as payment_date
    FROM checked_ticket ct
    INNER JOIN staff s ON ct.staff_id = s.id
    LEFT JOIN payment p ON ct.payment_id = p.id
    WHERE ct.date >= ?
      AND ct.date <= ?
      AND ct.paid = 1
      AND ct.checkin_by != s.username
    ORDER BY ct.date DESC, s.code
";

$tickets = DB::select($sql, [$fromDate, $toDate]);

echo "Tìm thấy " . count($tickets) . " vé không khớp" . PHP_EOL;
echo "Đang tạo file Excel..." . PHP_EOL;

// Tạo Excel
$spreadsheet = new Spreadsheet();
$sheet = $spreadsheet->getActiveSheet();
$sheet->setTitle("Vé không khớp");

// Header
$headers = [
    "STT",
    "Mã vé",
    "Loại vé",
    "Ngày",
    "Commission",
    "Mã NV được gán",
    "Tên NV được gán",
    "Username NV",
    "Checkin by",
    "Checkout by",
    "Checkin at",
    "Checkout at",
    "Đã thanh toán",
    "Mã thanh toán",
    "Ngày thanh toán"
];

$col = "A";
foreach ($headers as $header) {
    $sheet->setCellValue($col . "1", $header);
    $col++;
}

// Style header
$sheet->getStyle("A1:O1")->applyFromArray([
    "font" => ["bold" => true, "color" => ["rgb" => "FFFFFF"]],
    "fill" => [
        "fillType" => Fill::FILL_SOLID,
        "startColor" => ["rgb" => "4472C4"]
    ],
    "borders" => [
        "allBorders" => [
            "borderStyle" => Border::BORDER_THIN
        ]
    ],
    "alignment" => [
        "horizontal" => Alignment::HORIZONTAL_CENTER,
        "vertical" => Alignment::VERTICAL_CENTER
    ]
]);

// Data
$row = 2;
$stt = 1;
foreach ($tickets as $ticket) {
    $sheet->setCellValue("A" . $row, $stt++);
    $sheet->setCellValue("B" . $row, $ticket->ticket_code);
    $sheet->setCellValue("C" . $row, $ticket->ticket_name);
    $sheet->setCellValue("D" . $row, $ticket->date);
    $sheet->setCellValue("E" . $row, $ticket->commission);
    $sheet->setCellValue("F" . $row, $ticket->staff_code);
    $sheet->setCellValue("G" . $row, $ticket->staff_name);
    $sheet->setCellValue("H" . $row, $ticket->staff_username);
    $sheet->setCellValue("I" . $row, $ticket->checkin_by ?? "");
    $sheet->setCellValue("J" . $row, $ticket->checkout_by ?? "");
    $sheet->setCellValue("K" . $row, $ticket->checkin_at ?? "");
    $sheet->setCellValue("L" . $row, $ticket->checkout_at ?? "");
    $sheet->setCellValue("M" . $row, $ticket->paid ? "Có" : "Không");
    $sheet->setCellValue("N" . $row, $ticket->payment_code ?? "");
    $sheet->setCellValue("O" . $row, $ticket->payment_date ?? "");
    
    // Border cho data row
    $sheet->getStyle("A" . $row . ":O" . $row)->applyFromArray([
        "borders" => [
            "allBorders" => [
                "borderStyle" => Border::BORDER_THIN
            ]
        ]
    ]);
    
    $row++;
}

// Format số
$sheet->getStyle("E2:E" . ($row - 1))->getNumberFormat()->setFormatCode("#,##0");

// Auto width columns
foreach (range("A", "O") as $col) {
    $sheet->getColumnDimension($col)->setAutoSize(true);
}

// Alignment
$sheet->getStyle("A2:A" . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
$sheet->getStyle("E2:E" . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
$sheet->getStyle("M2:M" . ($row - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

// Thêm sheet thống kê
$summarySheet = $spreadsheet->createSheet();
$summarySheet->setTitle("Thống kê");

$summarySheet->setCellValue("A1", "THỐNG KÊ VÉ KHÔNG KHỚP");
$summarySheet->mergeCells("A1:B1");
$summarySheet->getStyle("A1")->getFont()->setBold(true)->setSize(14);

$summarySheet->setCellValue("A3", "Tổng số vé không khớp:");
$summarySheet->setCellValue("B3", count($tickets));

$totalCommission = array_sum(array_column($tickets, "commission"));
$summarySheet->setCellValue("A4", "Tổng tiền commission:");
$summarySheet->setCellValue("B4", number_format($totalCommission, 0, ",", ".") . " đ");

$summarySheet->setCellValue("A6", "Khoảng thời gian:");
$summarySheet->setCellValue("B6", $fromDate . " đến " . $toDate);

// Thống kê theo nhân viên
$summarySheet->setCellValue("A8", "Thống kê theo nhân viên:");
$summarySheet->setCellValue("A9", "Mã NV");
$summarySheet->setCellValue("B9", "Tên NV");
$summarySheet->setCellValue("C9", "Username");
$summarySheet->setCellValue("D9", "Số vé");
$summarySheet->setCellValue("E9", "Tổng tiền");

$summarySheet->getStyle("A9:E9")->applyFromArray([
    "font" => ["bold" => true],
    "fill" => [
        "fillType" => Fill::FILL_SOLID,
        "startColor" => ["rgb" => "DDDDDD"]
    ]
]);

// Group by staff
$staffStats = [];
foreach ($tickets as $ticket) {
    $key = $ticket->staff_code;
    if (!isset($staffStats[$key])) {
        $staffStats[$key] = [
            "code" => $ticket->staff_code,
            "name" => $ticket->staff_name,
            "username" => $ticket->staff_username,
            "count" => 0,
            "total" => 0
        ];
    }
    $staffStats[$key]["count"]++;
    $staffStats[$key]["total"] += $ticket->commission;
}

$summaryRow = 10;
foreach ($staffStats as $stat) {
    $summarySheet->setCellValue("A" . $summaryRow, $stat["code"]);
    $summarySheet->setCellValue("B" . $summaryRow, $stat["name"]);
    $summarySheet->setCellValue("C" . $summaryRow, $stat["username"]);
    $summarySheet->setCellValue("D" . $summaryRow, $stat["count"]);
    $summarySheet->setCellValue("E" . $summaryRow, number_format($stat["total"], 0, ",", "."));
    $summaryRow++;
}

foreach (range("A", "E") as $col) {
    $summarySheet->getColumnDimension($col)->setAutoSize(true);
}

// Output
$filename = "/tmp/ve_khong_khop_" . date("Y-m-d_H-i-s") . ".xlsx";
$writer = new Xlsx($spreadsheet);
$writer->save($filename);

echo "Đã tạo file thành công: " . $filename . PHP_EOL;
echo "Tổng số vé: " . count($tickets) . PHP_EOL;
echo "Tổng tiền: " . number_format($totalCommission, 0, ",", ".") . " đ" . PHP_EOL;
