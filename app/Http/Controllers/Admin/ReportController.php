<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GateStaffShift;
use App\Models\CheckedTicket;
use App\Models\Staff;
use App\Models\Payment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Firebase\JWT\JWT;

class ReportController extends Controller
{
    public function getWaitingList(Request $request)
    {
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $staffGroupId = $request->input('staff_group_id');
        $vehicleType = $request->input('vehicle_type');

        $query = GateStaffShift::query()
            ->select([
                'staff.code as staff_code',
                'staff.name as staff_name',
                'staff_group.name as staff_group_name',
                'gate_staff_shift.date as date_raw',
                'staff.vehical_type as vehical_type',
                'gate.name as gate_name',
                DB::raw("DATE_FORMAT(gate_staff_shift.date, '%d/%m/%Y') as date_display"),
                DB::raw("'Đang chờ' as status")
            ])
            ->join('staff', 'gate_staff_shift.staff_id', '=', 'staff.id')
            ->join('staff_group', 'staff.group_id', '=', 'staff_group.id')
            ->join('gate', 'gate_staff_shift.gate_id', '=', 'gate.id')
            ->where('gate_staff_shift.status', GateStaffShift::STATUS_WAITING);

        if ($fromDate) {
            $query->whereDate('gate_staff_shift.date', '>=', $fromDate);
        }

        if ($toDate) {
            $query->whereDate('gate_staff_shift.date', '<=', $toDate);
        }

        if ($staffGroupId) {
            $query->where('staff_group.id', $staffGroupId);
        }

        if ($vehicleType) {
            $query->where('staff_group.vehicle_type', $vehicleType);
        }

        $result = $query->orderBy('staff.code', 'asc')->get();

        foreach ($result as $item) {
            $item->vehical_type_name = Staff::getVehicalTypeName($item->vehical_type);
        }

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    public function getStaffReport(Request $request)
    {
        try {
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $staffGroupId = $request->input('staff_group_id');
            $status = $request->input('status');
            $staffId = $request->input('staff_id');

            $fromDate = $fromDate ? Carbon::parse($fromDate)->startOfDay() : null;
            $toDate = $toDate ? Carbon::parse($toDate)->endOfDay() : null;

            $result = DB::select(
                'CALL sp_get_staff_report(?, ?, ?, ?, ?)',
                [
                    $fromDate,
                    $toDate,
                    $staffGroupId ?: null,
                    $status ?: null,
                    $staffId ?: null
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Lấy dữ liệu thành công',
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getTicketReport(Request $request)
    {
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $ticketCode = $request->input('ticket_code');
        $staffName = $request->input('staff_name');
        $ticketStatus = $request->input('ticket_status');

        $query = CheckedTicket::query()
            ->select([
                'checked_ticket.*',
                'staff.name as staff_name',
                'staff.code as staff_code',
                'gate_staff_shift.date as shift_date',
                DB::raw("DATE_FORMAT(checked_ticket.checkin_at, '%d/%m/%Y %H:%i') as checkin_at_formatted"),
                DB::raw("DATE_FORMAT(checked_ticket.checkout_at, '%d/%m/%Y %H:%i') as checkout_at_formatted"),
                DB::raw("DATE_FORMAT(checked_ticket.issue_date, '%d/%m/%Y') as issue_date_formatted"),
                DB::raw("DATE_FORMAT(checked_ticket.expired_date, '%d/%m/%Y') as expired_date_formatted"),
                DB::raw("CASE
                    WHEN checked_ticket.status = '" . CheckedTicket::STATUS_CHECKIN . "' THEN 'Chưa hoàn thành'
                    WHEN checked_ticket.status = '" . CheckedTicket::STATUS_CHECKOUT . "' THEN 'Đã hoàn thành'
                    ELSE 'Không xác định'
                END as status_text")
            ])
            ->join('staff', 'checked_ticket.staff_id', '=', 'staff.id')
            ->leftJoin('gate_staff_shift', 'checked_ticket.gate_staff_shift_id', '=', 'gate_staff_shift.id');

        if ($fromDate) {
            $query->whereDate('checked_ticket.date', '>=', $fromDate);
        }

        if ($toDate) {
            $query->whereDate('checked_ticket.date', '<=', $toDate);
        }

        if ($ticketCode) {
            $query->where('checked_ticket.code', 'like', '%' . $ticketCode . '%');
        }

        if ($staffName) {
            $query->where('staff.name', 'like', '%' . $staffName . '%');
        }

        if ($ticketStatus) {
            $query->where('checked_ticket.status', $ticketStatus);
        }

        $result = $query->orderBy('checked_ticket.code', 'asc')
                        ->orderBy('checked_ticket.date', 'asc')
                        ->get();

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    public function getPaymentReport(Request $request)
    {
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $paymentCode = $request->input('payment_code');
        $staffCode = $request->input('staff_code');

        $query = Payment::query()
            ->select([
                'payment.id',
                'payment.transaction_code as payment_code',
                'payment.amount',
                'payment.payment_method',
                'payment.date',
                'payment.note',
                'payment.bank',
                'payment.received_account',
                DB::raw("DATE_FORMAT(payment.date, '%Y/%m/%d') as payment_date"),
                'staff.code as staff_code',
                'staff.code as code',
                'staff.username as staff_username',
                'staff.name as staff_name',
                'staff.username',
                'staff.card_id',
                'payment.created_by'
            ])
            ->join('staff', 'payment.staff_id', '=', 'staff.id')
            ->where('payment.status', Payment::STATUS_ACTIVE);

        if ($fromDate) {
            $query->whereDate('payment.date', '>=', $fromDate);
        }

        if ($toDate) {
            $query->whereDate('payment.date', '<=', $toDate);
        }

        if ($paymentCode) {
            $query->where('payment.transaction_code', 'like', '%' . $paymentCode . '%');
        }

        if ($staffCode) {
            $query->where('staff.code', 'like', '%' . $staffCode . '%');
        }

        $result = $query->orderBy('payment.date', 'desc')
                        ->orderBy('payment.transaction_code', 'asc')
                        ->get()
                        ->map(function ($payment) {
                            $payment->payment_method = $this->formatPaymentMethod($payment->payment_method);

                            $payment->tickets = [];
                            $payment->total_commission = 0;

                            // Xóa id khỏi response
                            unset($payment->id);

                            return $payment;
                        });

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    public function getTicketByName(Request $request)
    {
        try {
            // Lấy tham số từ request
            $fromDate = $request->input('from_date', Carbon::today()->format('Y-m-d')) . ' 00:00:00';
            $toDate = $request->input('to_date', Carbon::today()->format('Y-m-d')) . ' 23:59:59';

            // Chuyển đổi thành đối tượng Carbon để xử lý ngày
            $fromDate = Carbon::parse($fromDate)->startOfDay();
            $toDate = Carbon::parse($toDate)->endOfDay();

            $result = DB::table('checked_ticket')
                ->select([
                    'checked_ticket.name as ticket_name',
                    DB::raw('COUNT(DISTINCT checked_ticket.code) as total_count'),
                    DB::raw('ROUND((COUNT(DISTINCT checked_ticket.code) * 100.0 / (SELECT COUNT(DISTINCT code) FROM checked_ticket WHERE date >= ? AND date <= ?)), 2) as percentage')
                ])
                ->whereBetween('checked_ticket.checkin_at', [$fromDate, $toDate])
                ->groupBy('checked_ticket.name')
                ->orderBy('total_count', 'desc')
                ->setBindings([$fromDate, $toDate, $fromDate, $toDate])
                ->get()
                ->map(function($item) {
                    // Tạo màu ngẫu nhiên cho từng loại vé
                    $hue = rand(0, 360);
                    return [
                        'name' => $item->ticket_name,
                        'value' => $item->total_count,
                        'percentage' => $item->percentage,
                        'color' => "hsl({$hue}, 70%, 50%)",
                        // Thêm các thuộc tính cho tooltip
                        'tooltip' => [
                            'title' => $item->ticket_name,
                            'content' => [
                                'Số lượng: ' . number_format($item->total_count),
                                'Tỷ lệ: ' . number_format($item->percentage, 2) . '%'
                            ]
                        ]
                    ];
                });

            // Tính tổng số vé
            $totalTickets = $result->sum('value');

            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $result,
                    'total' => $totalTickets,
                    'date_range' => [
                        'from_date' => $fromDate->format('Y-m-d'),
                        'to_date' => $toDate->format('Y-m-d')
                    ],
                    'chart_config' => [
                        'type' => 'pie',
                        'options' => [
                            'legend' => [
                                'position' => 'right',
                                'align' => 'center'
                            ],
                            'tooltips' => [
                                'enabled' => true,
                                'mode' => 'point'
                            ],
                            'animation' => [
                                'animateScale' => true,
                                'animateRotate' => true
                            ]
                        ]
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi lấy thống kê vé: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getStaffReportByCode(Request $request)
    {
        try {
            $staffCode = $request->input('staff_code');
            $limit = $request->input('limit', 10);

            if (!$staffCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập mã nhân viên'
                ], 422);
            }

            // Lấy thông tin staff và các ca làm việc
            $result = DB::select("
                WITH staff_shifts AS (
                    SELECT
                        s.code as staff_code,
                        s.name as staff_name,
                        s.username,
                        sg.name as staff_group_name,
                        s.vehical_type,
                        gss.date,
                        DATE_FORMAT(gss.date, '%d/%m/%Y') as date_display,
                        g.name as gate_name,
                        gss.checkin_at,
                        gss.checkout_at,
                        CASE
                            WHEN gss.status = 'WAITING' THEN 'Đang chờ'
                            WHEN gss.status = 'CHECKIN' THEN 'Đang làm việc'
                            WHEN gss.status = 'CHECKOUT' THEN 'Đã checkout'
                            ELSE gss.status
                        END as status,
                        (
                            SELECT COUNT(*)
                            FROM checked_ticket
                            WHERE gate_staff_shift_id = gss.id
                            AND checkin_by = s.username
                        ) as checkin_count,
                        (
                            SELECT COUNT(*)
                            FROM checked_ticket
                            WHERE gate_staff_shift_id = gss.id
                            AND checkout_by = s.username
                        ) as checkout_count
                    FROM staff s
                    LEFT JOIN staff_group sg ON s.group_id = sg.id
                    LEFT JOIN gate_staff_shift gss ON s.id = gss.staff_id
                    LEFT JOIN gate g ON gss.gate_id = g.id
                    WHERE s.code = ?
                    ORDER BY gss.date DESC, gss.checkin_at DESC
                    LIMIT ?
                )
                SELECT * FROM staff_shifts
            ", [$staffCode, $limit]);

            if (empty($result)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy thông tin nhân viên'
                ], 404);
            }

            // Lấy thông tin cơ bản của nhân viên từ bản ghi đầu tiên
            $staffInfo = [
                'staff_code' => $result[0]->staff_code,
                'staff_name' => $result[0]->staff_name,
                'staff_group_name' => $result[0]->staff_group_name,
                'vehical_type' => Staff::getVehicalTypeName($result[0]->vehical_type)
            ];

            // Xử lý danh sách ca làm việc
            $shifts = collect($result)->map(function($item) {
                return [
                    'date' => $item->date,
                    'date_display' => $item->date_display,
                    'gate_name' => $item->gate_name,
                    'checkin_at' => $item->checkin_at ? Carbon::parse($item->checkin_at)->format('d/m/Y H:i:s') : null,
                    'checkout_at' => $item->checkout_at ? Carbon::parse($item->checkout_at)->format('d/m/Y H:i:s') : null,
                    'status' => $item->status,
                    'tickets' => [
                        'checkin' => (int)$item->checkin_count,
                        'checkout' => (int)$item->checkout_count
                    ]
                ];
            })->filter(function($shift) {
                return $shift['gate_name'] !== null; // Lọc bỏ các bản ghi không có ca làm việc
            })->values();

            // Tính toán thống kê
            $statistics = [
                'total_shifts' => $shifts->count(),
                'total_tickets_checkin' => $shifts->sum('tickets.checkin'),
                'total_tickets_checkout' => $shifts->sum('tickets.checkout')
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'staff_info' => $staffInfo,
                    'shifts' => $shifts,
                    'statistics' => $statistics
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getTicketStatusReport(Request $request)
    {
        try {
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');

            if (!$fromDate || !$toDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập đầy đủ từ ngày và đến ngày'
                ], 422);
            }

            // Lấy JWT secret từ env (hỗ trợ cả 2 tên biến)
            $jwtSecret = env('N8N_JWT_SECRET') ?: env('N8N_JWT_TOKEN');

            if (!$jwtSecret) {
                return response()->json([
                    'success' => false,
                    'message' => 'JWT Secret chưa được cấu hình. Vui lòng thêm N8N_JWT_SECRET hoặc N8N_JWT_TOKEN vào file .env và chạy: php artisan config:clear'
                ], 500);
            }

            // Tạo JWT token với payload rỗng (như trong Postman)
            $payload = [
                'iat' => time(),
                'exp' => time() + 3600 // Token hết hạn sau 1 giờ
            ];

            $jwtToken = JWT::encode($payload, $jwtSecret, 'HS256');

            // Gọi API n8n với header Authorization Bearer
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $jwtToken,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ])->post('https://n8n-prod.thinksoft.com.vn/webhook/59f43171-b5e6-4612-a196-9e13db2eae36', [
                'fromDate' => $fromDate . ' 00:00:00',
                'toDate' => $toDate . ' 23:59:59'
            ]);

            if ($response->successful()) {
                $data = $response->json();

                // Format dữ liệu để hiển thị
                $formattedData = collect($data)->map(function ($item) {
                    return [
                        'id' => $item['ID'] ?? null,
                        'account_code' => $item['AccountCode'] ?? null,
                        'booking_detail_id' => $item['BookingDetailID'] ?? null,
                        'issued_date' => $item['IssuedDate'] ? Carbon::parse($item['IssuedDate'])->format('d/m/Y') : null,
                        'expiration_date' => $item['ExpirationDate'] ? Carbon::parse($item['ExpirationDate'])->format('d/m/Y') : null,
                        'total_money' => $item['TotalMoney'] ?? 0,
                        'status' => $item['Status'] ?? null,
                        'status_text' => $this->formatTicketStatus($item['Status'] ?? null),
                        'booking_id' => $item['BookingID'] ?? null,
                        'created_by' => $item['CreatedBy'] ?? null,
                        'created_date' => $item['CreatedDate'] ? Carbon::parse($item['CreatedDate'])->format('d/m/Y H:i:s') : null,
                        'sequence' => $item['Sequence'] ?? null,
                        'service_rate_id' => $item['ServiceRateID'] ?? null,
                        'invoice_status' => $item['InvoiceStatus'] ?? null,
                        'invoice_number' => $item['InvoiceNumber'] ?? null,
                        'invoice_sign_date' => $item['InvoiceSignDate'] ? Carbon::parse($item['InvoiceSignDate'])->format('d/m/Y H:i:s') : null,
                        'invoice_created_date' => $item['InvoiceCreatedDate'] ? Carbon::parse($item['InvoiceCreatedDate'])->format('d/m/Y H:i:s') : null,
                        // Giữ nguyên dữ liệu gốc
                        'raw' => $item
                    ];
                });

                return response()->json([
                    'success' => true,
                    'message' => 'Lấy dữ liệu thành công',
                    'data' => $formattedData
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Lỗi khi gọi API: ' . $response->body()
                ], $response->status());
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    private function formatTicketStatus($status)
    {
        $statusMap = [
            'INACTIVE' => 'Chưa kích hoạt',
            'CLOSE' => 'Đã đóng',
            'ACTIVE' => 'Đang hoạt động',
            'OPEN' => 'Đang mở'
        ];

        return $statusMap[$status] ?? $status;
    }

    private function formatPaymentMethod($method)
    {
        $methods = [
            Payment::PAYMENT_METHOD_BANK_TRANSFER => 'Chuyển khoản',
            Payment::PAYMENT_METHOD_CASH => 'Tiền mặt'
        ];

        return $methods[$method] ?? $method;
    }
}
