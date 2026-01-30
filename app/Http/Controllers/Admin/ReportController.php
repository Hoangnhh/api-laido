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
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

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
            // Nếu có parameter 'date' thì dùng cho cả from_date và to_date
            if ($request->has('date')) {
                $date = $request->input('date');
                $fromDate = $date . ' 00:00:00';
                $toDate = $date . ' 23:59:59';
            } else {
                $fromDate = $request->input('from_date', Carbon::today()->format('Y-m-d')) . ' 00:00:00';
                $toDate = $request->input('to_date', Carbon::today()->format('Y-m-d')) . ' 23:59:59';
            }

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
            // Nhận tham số với camelCase
            $fromDate = $request->input('fromDate') ?: $request->input('from_date');
            $toDate = $request->input('toDate') ?: $request->input('to_date');
            $pageNumber = $request->input('pageNumber', 1);
            $pageSize = $request->input('pageSize', 50);

            if (!$fromDate || !$toDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập đầy đủ từ ngày và đến ngày'
                ], 422);
            }

            // Kiểm tra khoảng thời gian không quá 1 tháng
            $from = Carbon::parse($fromDate);
            $to = Carbon::parse($toDate);
            $daysDiff = $from->diffInDays($to);

            if ($daysDiff > 31) {
                return response()->json([
                    'success' => false,
                    'message' => 'Khoảng thời gian truy vấn không được vượt quá 1 tháng (31 ngày)'
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

            // Gọi API n8n với header Authorization Bearer và timeout 120 giây
            // Gửi pageNumber và pageSize để hỗ trợ phân trang
            $response = Http::timeout(120)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $jwtToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])
                ->post('https://n8n-prod.thinksoft.com.vn/webhook/59f43171-b5e6-4612-a196-9e13db2eae36', [
                    'fromDate' => $fromDate . ' 00:00:00',
                    'toDate' => $toDate . ' 23:59:59',
                    'pageNumber' => (int)$pageNumber,
                    'pageSize' => (int)$pageSize
                ]);

            if ($response->successful()) {
                $data = $response->json();

                // Kiểm tra nếu response là mảng trực tiếp (format mới với phân trang)
                if (is_array($data) && count($data) > 0) {
                    // Response đã có format đúng với totalCount trong mỗi item
                    // Trả về mảng trực tiếp như yêu cầu
                    return response()->json($data);
                }

                // Fallback: Format dữ liệu cũ nếu API trả về format khác
                $formattedData = collect($data)->map(function ($item) {
                    return [
                        'ID' => $item['ID'] ?? null,
                        'AccountCode' => $item['AccountCode'] ?? null,
                        'IssuedDate' => $item['IssuedDate'] ?? null,
                        'ExpirationDate' => $item['ExpirationDate'] ?? null,
                        'TotalMoney' => $item['TotalMoney'] ?? 0,
                        'Status' => $item['Status'] ?? null,
                        'CreatedBy' => $item['CreatedBy'] ?? null,
                        'CreatedDate' => $item['CreatedDate'] ?? null,
                        'Sequence' => $item['Sequence'] ?? null,
                        'ServiceName' => $item['ServiceName'] ?? null,
                        'InvoiceStatus' => $item['InvoiceStatus'] ?? null,
                        'InvoiceNumber' => $item['InvoiceNumber'] ?? null,
                        'InvoiceCode' => $item['InvoiceCode'] ?? null,
                        'InvoiceSignDate' => $item['InvoiceSignDate'] ?? null,
                        'InvoiceCreatedDate' => $item['InvoiceCreatedDate'] ?? null,
                        'totalCount' => $item['totalCount'] ?? 0
                    ];
                });

                return response()->json($formattedData);
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

    public function getTicketStatusStatistics(Request $request)
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

            // Kiểm tra khoảng thời gian không quá 1 tháng
            $from = Carbon::parse($fromDate);
            $to = Carbon::parse($toDate);
            $daysDiff = $from->diffInDays($to);

            if ($daysDiff > 31) {
                return response()->json([
                    'success' => false,
                    'message' => 'Khoảng thời gian truy vấn không được vượt quá 1 tháng (31 ngày)'
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

            // Gọi API n8n thống kê với header Authorization Bearer và timeout 120 giây
            $response = Http::timeout(120)
                ->withHeaders([
                    'Authorization' => 'Bearer ' . $jwtToken,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])
                ->post('https://n8n-prod.thinksoft.com.vn/webhook/5de638e5-38c9-4cdd-9816-307629a4c612', [
                    'fromDate' => $fromDate . ' 00:00:00',
                    'toDate' => $toDate . ' 23:59:59'
                ]);

            if ($response->successful()) {
                $data = $response->json();

                // Format dữ liệu để hiển thị
                $formattedData = collect($data)->map(function ($item) {
                    return [
                        'service_name' => $item['ServiceName'] ?? null,
                        'total_tickets' => $item['TotalTickets'] ?? 0,
                        'invoice_created' => $item['InvoiceCreated'] ?? 0,
                        'invoice_not_created' => $item['InvoiceNotCreated'] ?? 0
                    ];
                });

                return response()->json([
                    'success' => true,
                    'message' => 'Lấy dữ liệu thống kê thành công',
                    'data' => $formattedData
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Lỗi khi gọi API: ' . $response->body()
                ], $response->status());
            }

        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể kết nối đến server. Vui lòng thử lại sau.'
            ], 503);
        } catch (\Illuminate\Http\Client\RequestException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi gọi API: ' . $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            \Log::error('Error in getTicketStatusStatistics: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get JSON báo cáo thanh toán vé lái đò cho FE hiển thị
     * Tách riêng vé chỉ chiều vào và vé đủ 2 chiều
     */
    public function getBoatOperatorPaymentReport(Request $request)
    {
        try {
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $staffSearch = $request->input('staff_search');
            $ticketType = $request->input('ticket_type');

            if (!$fromDate || !$toDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập đầy đủ từ ngày và đến ngày'
                ], 422);
            }

            $fromDateParsed = Carbon::parse($fromDate)->format('Y-m-d');
            $toDateParsed = Carbon::parse($toDate)->format('Y-m-d');

            // Build filters dynamically
            $filters = [];
            $params = [$fromDateParsed, $toDateParsed];

            if ($staffSearch) {
                $filters[] = "(s.code LIKE ? OR s.name LIKE ?)";
                $params[] = "%{$staffSearch}%";
                $params[] = "%{$staffSearch}%";
            }

            if ($ticketType) {
                $filters[] = "ct.name = ?";
                $params[] = $ticketType;
            }

            $whereClause = count($filters) > 0 ? "AND " . implode(" AND ", $filters) : "";

            $sql = "
                SELECT
                    s.id as staff_id,
                    s.code as staff_code,
                    s.name as staff_name,
                    ct.name as ticket_type,
                    ct.commission as price,
                    CASE
                        WHEN ct.checkin_by = s.username AND ct.checkout_by = s.username THEN '2 Chiều'
                        WHEN ct.checkin_by = s.username AND (ct.checkout_by IS NULL OR ct.checkout_by != s.username) THEN 'Chiều vào'
                    END as direction,
                    COUNT(DISTINCT ct.code) as quantity,
                    SUM(ct.commission) as total_amount
                FROM checked_ticket ct
                INNER JOIN staff s ON ct.staff_id = s.id
                WHERE ct.date >= ?
                  AND ct.date <= ?
                  AND ct.checkin_by = s.username
                  {$whereClause}
                GROUP BY
                    s.id, s.code, s.name, ct.name, ct.commission,
                    CASE
                        WHEN ct.checkin_by = s.username AND ct.checkout_by = s.username THEN '2 Chiều'
                        WHEN ct.checkin_by = s.username AND (ct.checkout_by IS NULL OR ct.checkout_by != s.username) THEN 'Chiều vào'
                    END
                HAVING direction IS NOT NULL
                ORDER BY s.code ASC, ct.name ASC, direction DESC
            ";

            $results = DB::select($sql, $params);

            // Tính tổng
            $totalQuantity = 0;
            $totalAmount = 0;
            foreach ($results as $row) {
                $totalQuantity += $row->quantity;
                $totalAmount += $row->total_amount;
            }

            // Format items với STT
            $items = [];
            $stt = 1;
            foreach ($results as $row) {
                $items[] = [
                    'stt' => $stt++,
                    'staff_code' => $row->staff_code,
                    'staff_name' => $row->staff_name,
                    'ticket_type' => $row->ticket_type,
                    'direction' => $row->direction,
                    'price' => (int) $row->price,
                    'quantity' => (int) $row->quantity,
                    'total_amount' => (int) $row->total_amount
                ];
            }

            // Tên filter nhân viên
            $staffFilterName = 'Tất cả';
            if ($staffSearch) {
                $staffFilterName = "Tìm kiếm: {$staffSearch}";
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'report_title' => 'BẢNG KÊ THANH TOÁN VÉ LÁI ĐÒ',
                    'service_name' => 'Dịch vụ đò Hương Tích',
                    'date_range' => [
                        'from_date' => Carbon::parse($fromDate)->format('d/m/Y'),
                        'to_date' => Carbon::parse($toDate)->format('d/m/Y')
                    ],
                    'staff_filter' => $staffFilterName,
                    'summary' => [
                        'total_quantity' => $totalQuantity,
                        'total_amount' => $totalAmount
                    ],
                    'items' => $items
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get danh sách loại vé từ checked_ticket
     */
    public function getTicketTypes(Request $request)
    {
        try {
            $ticketTypes = DB::table('checked_ticket')
                ->select('name')
                ->distinct()
                ->whereNotNull('name')
                ->orderBy('name')
                ->pluck('name');

            return response()->json([
                'success' => true,
                'data' => $ticketTypes
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export Excel báo cáo thanh toán vé lái đò
     * Tách riêng vé chỉ chiều vào và vé đủ 2 chiều
     */
    public function exportBoatOperatorPaymentReport(Request $request)
    {
        try {
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $staffSearch = $request->input('staff_search');
            $ticketType = $request->input('ticket_type');

            if (!$fromDate || !$toDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập đầy đủ từ ngày và đến ngày'
                ], 422);
            }

            $fromDateParsed = Carbon::parse($fromDate)->format('Y-m-d');
            $toDateParsed = Carbon::parse($toDate)->format('Y-m-d');

            // Build filters dynamically
            $filters = [];
            $params = [$fromDateParsed, $toDateParsed];

            if ($staffSearch) {
                $filters[] = "(s.code LIKE ? OR s.name LIKE ?)";
                $params[] = "%{$staffSearch}%";
                $params[] = "%{$staffSearch}%";
            }

            if ($ticketType) {
                $filters[] = "ct.name = ?";
                $params[] = $ticketType;
            }

            $whereClause = count($filters) > 0 ? "AND " . implode(" AND ", $filters) : "";

            $sql = "
                SELECT
                    s.id as staff_id,
                    s.code as staff_code,
                    s.name as staff_name,
                    ct.name as ticket_type,
                    ct.commission as price,
                    CASE
                        WHEN ct.checkin_by = s.username AND ct.checkout_by = s.username THEN '2 Chiều'
                        WHEN ct.checkin_by = s.username AND (ct.checkout_by IS NULL OR ct.checkout_by != s.username) THEN 'Chiều vào'
                    END as direction,
                    COUNT(DISTINCT ct.code) as quantity,
                    SUM(ct.commission) as total_amount
                FROM checked_ticket ct
                INNER JOIN staff s ON ct.staff_id = s.id
                WHERE ct.date >= ?
                  AND ct.date <= ?
                  AND ct.checkin_by = s.username
                  {$whereClause}
                GROUP BY
                    s.id, s.code, s.name, ct.name, ct.commission,
                    CASE
                        WHEN ct.checkin_by = s.username AND ct.checkout_by = s.username THEN '2 Chiều'
                        WHEN ct.checkin_by = s.username AND (ct.checkout_by IS NULL OR ct.checkout_by != s.username) THEN 'Chiều vào'
                    END
                HAVING direction IS NOT NULL
                ORDER BY s.code ASC, ct.name ASC, direction DESC
            ";

            $results = DB::select($sql, $params);

            // Tính tổng
            $totalQuantity = 0;
            $totalAmount = 0;
            foreach ($results as $row) {
                $totalQuantity += $row->quantity;
                $totalAmount += $row->total_amount;
            }

            // Tên filter nhân viên
            $staffFilterName = 'Tất cả';
            if ($staffSearch) {
                $staffFilterName = "Tìm kiếm: {$staffSearch}";
            }

            // Tạo Excel
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Báo cáo vé lái đò');

            // Header công ty
            $sheet->setCellValue('A1', 'HTX DỊCH VỤ DU LỊCH CHÙA HƯƠNG');
            $sheet->setCellValue('A2', 'Dịch vụ đò Hương Tích');
            $sheet->mergeCells('A1:C1');
            $sheet->mergeCells('A2:C2');

            // Tiêu đề báo cáo
            $sheet->setCellValue('D1', 'BẢNG KÊ THANH TOÁN VÉ LÁI ĐÒ');
            $sheet->setCellValue('D2', 'Từ ngày: ' . Carbon::parse($fromDate)->format('d/m/Y') . ' đến ' . Carbon::parse($toDate)->format('d/m/Y'));
            $sheet->setCellValue('D3', 'Nhân viên thanh toán: ' . $staffFilterName);
            $sheet->mergeCells('D1:G1');
            $sheet->mergeCells('D2:G2');
            $sheet->mergeCells('D3:G3');

            // Style header
            $sheet->getStyle('A1:G1')->getFont()->setBold(true)->setSize(14);
            $sheet->getStyle('D1')->getFont()->setBold(true)->setSize(16);
            $sheet->getStyle('D1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Tiêu đề cột (row 5)
            $headerRow = 5;
            $headers = ['STT', 'Số đò', 'Tên lái đò', 'Loại vé', 'Mệnh giá', 'Số lượng', 'Thành tiền'];
            $columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

            foreach ($headers as $index => $header) {
                $sheet->setCellValue($columns[$index] . $headerRow, $header);
            }

            // Style header row
            $sheet->getStyle('A' . $headerRow . ':G' . $headerRow)->applyFromArray([
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'CCCCCC']
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN
                    ]
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER
                ]
            ]);

            // Dòng tổng (row 6)
            $summaryRow = 6;
            $sheet->setCellValue('C' . $summaryRow, Carbon::parse($fromDate)->format('d/m/Y') . ' - ' . Carbon::parse($toDate)->format('d/m/Y'));
            $sheet->setCellValue('F' . $summaryRow, $totalQuantity);
            $sheet->setCellValue('G' . $summaryRow, $totalAmount);
            $sheet->getStyle('A' . $summaryRow . ':G' . $summaryRow)->getFont()->setBold(true);
            $sheet->getStyle('A' . $summaryRow . ':G' . $summaryRow)->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN
                    ]
                ]
            ]);

            // Data rows
            $currentRow = 7;
            $stt = 1;
            foreach ($results as $row) {
                $sheet->setCellValue('A' . $currentRow, $stt++);
                $sheet->setCellValue('B' . $currentRow, $row->staff_code);
                $sheet->setCellValue('C' . $currentRow, $row->staff_name);
                $sheet->setCellValue('D' . $currentRow, $row->ticket_type . ' (' . $row->direction . ')');
                $sheet->setCellValue('E' . $currentRow, (int)$row->price);
                $sheet->setCellValue('F' . $currentRow, (int)$row->quantity);
                $sheet->setCellValue('G' . $currentRow, (int)$row->total_amount);

                // Border cho data row
                $sheet->getStyle('A' . $currentRow . ':G' . $currentRow)->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN
                        ]
                    ]
                ]);

                $currentRow++;
            }

            // Format số
            $sheet->getStyle('E6:G' . ($currentRow - 1))->getNumberFormat()->setFormatCode('#,##0');

            // Auto width columns
            foreach ($columns as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            // Alignment
            $sheet->getStyle('A6:B' . ($currentRow - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle('E6:G' . ($currentRow - 1))->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            // Output
            $filename = 'bao-cao-ve-lai-do-' . date('Y-m-d-H-i-s') . '.xlsx';

            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment;filename="' . $filename . '"');
            header('Cache-Control: max-age=0');

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            exit;

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Báo cáo thanh toán lái đò v2 - Group theo nhân viên và ngày
     */
    public function getBoatOperatorPaymentReportV2(Request $request)
    {
        try {
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $staffSearch = $request->input('staff_search');

            if (!$fromDate || !$toDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập đầy đủ từ ngày và đến ngày'
                ], 422);
            }

            $fromDateParsed = Carbon::parse($fromDate)->format('Y-m-d');
            $toDateParsed = Carbon::parse($toDate)->format('Y-m-d');

            // Giới hạn khoảng thời gian tối đa 1 năm để tránh quá tải
            $daysDiff = Carbon::parse($fromDateParsed)->diffInDays(Carbon::parse($toDateParsed));
            if ($daysDiff > 365) {
                return response()->json([
                    'success' => false,
                    'message' => 'Khoảng thời gian tìm kiếm không được vượt quá 365 ngày'
                ], 422);
            }

            // Build filters dynamically
            $filters = [];
            $params = [$fromDateParsed, $toDateParsed];

            if ($staffSearch) {
                $filters[] = "(s.code LIKE ? OR s.name LIKE ?)";
                $params[] = "%{$staffSearch}%";
                $params[] = "%{$staffSearch}%";
            }

            $whereClause = count($filters) > 0 ? "AND " . implode(" AND ", $filters) : "";

            // Tăng giới hạn thời gian và bộ nhớ cho request lớn
            set_time_limit(120);
            ini_set('memory_limit', '512M');

            // Query tối ưu: sử dụng subquery để filter trước khi join
            $sql = "
                SELECT
                    s.id as staff_id,
                    s.code as staff_code,
                    s.name as staff_name,
                    ct.date as ticket_date,
                    ct.commission as price,
                    COUNT(*) as quantity,
                    SUM(ct.commission) as total_amount
                FROM checked_ticket ct
                INNER JOIN staff s ON ct.staff_id = s.id AND ct.checkin_by = s.username
                WHERE ct.date >= ?
                  AND ct.date <= ?
                  {$whereClause}
                GROUP BY
                    s.id, s.code, s.name, ct.date, ct.commission
                ORDER BY s.name ASC, ct.date ASC, ct.commission DESC
            ";

            $results = DB::select($sql, $params);

            // Tổ chức dữ liệu theo cấu trúc nhân viên > ngày > vé
            $staffData = [];
            $totalQuantity = 0;
            $totalAmount = 0;

            foreach ($results as $row) {
                $staffId = $row->staff_id;
                $date = $row->ticket_date;

                if (!isset($staffData[$staffId])) {
                    $staffData[$staffId] = [
                        'staff_id' => $staffId,
                        'staff_code' => $row->staff_code,
                        'staff_name' => $row->staff_name,
                        'total_quantity' => 0,
                        'total_amount' => 0,
                        'dates' => []
                    ];
                }

                if (!isset($staffData[$staffId]['dates'][$date])) {
                    $staffData[$staffId]['dates'][$date] = [
                        'date' => $date,
                        'date_display' => Carbon::parse($date)->format('d/m/Y'),
                        'tickets' => [],
                        'day_total_quantity' => 0,
                        'day_total_amount' => 0
                    ];
                }

                // Thêm vé vào ngày
                $staffData[$staffId]['dates'][$date]['tickets'][] = [
                    'price' => (int) $row->price,
                    'quantity' => (int) $row->quantity,
                    'total_amount' => (int) $row->total_amount
                ];

                // Cộng dồn cho ngày
                $staffData[$staffId]['dates'][$date]['day_total_quantity'] += $row->quantity;
                $staffData[$staffId]['dates'][$date]['day_total_amount'] += $row->total_amount;

                // Cộng dồn cho nhân viên
                $staffData[$staffId]['total_quantity'] += $row->quantity;
                $staffData[$staffId]['total_amount'] += $row->total_amount;

                // Cộng dồn tổng
                $totalQuantity += $row->quantity;
                $totalAmount += $row->total_amount;
            }

            // Chuyển đổi dates từ associative array sang indexed array
            foreach ($staffData as &$staff) {
                $staff['dates'] = array_values($staff['dates']);
            }

            // Chuyển staffData từ associative array sang indexed array
            $items = array_values($staffData);

            return response()->json([
                'success' => true,
                'data' => [
                    'report_title' => 'BẢNG KÊ THANH TOÁN VÉ LÁI ĐÒ V2',
                    'service_name' => 'Dịch vụ đò Hương Tích',
                    'date_range' => [
                        'from_date' => Carbon::parse($fromDate)->format('d/m/Y'),
                        'to_date' => Carbon::parse($toDate)->format('d/m/Y')
                    ],
                    'staff_filter' => $staffSearch ? "Tìm kiếm: {$staffSearch}" : 'Tất cả',
                    'summary' => [
                        'total_quantity' => $totalQuantity,
                        'total_amount' => $totalAmount,
                        'total_staff' => count($items)
                    ],
                    'items' => $items
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export Excel báo cáo thanh toán lái đò v2
     */
    public function exportBoatOperatorPaymentReportV2(Request $request)
    {
        try {
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $staffSearch = $request->input('staff_search');

            if (!$fromDate || !$toDate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập đầy đủ từ ngày và đến ngày'
                ], 422);
            }

            $fromDateParsed = Carbon::parse($fromDate)->format('Y-m-d');
            $toDateParsed = Carbon::parse($toDate)->format('Y-m-d');

            // Giới hạn khoảng thời gian tối đa 1 năm
            $daysDiff = Carbon::parse($fromDateParsed)->diffInDays(Carbon::parse($toDateParsed));
            if ($daysDiff > 365) {
                return response()->json([
                    'success' => false,
                    'message' => 'Khoảng thời gian xuất không được vượt quá 365 ngày'
                ], 422);
            }

            // Build filters dynamically
            $filters = [];
            $params = [$fromDateParsed, $toDateParsed];

            if ($staffSearch) {
                $filters[] = "(s.code LIKE ? OR s.name LIKE ?)";
                $params[] = "%{$staffSearch}%";
                $params[] = "%{$staffSearch}%";
            }

            $whereClause = count($filters) > 0 ? "AND " . implode(" AND ", $filters) : "";

            // Tăng giới hạn thời gian và bộ nhớ cho export
            set_time_limit(300);
            ini_set('memory_limit', '1G');

            // Query tối ưu
            $sql = "
                SELECT
                    s.id as staff_id,
                    s.code as staff_code,
                    s.name as staff_name,
                    ct.date as ticket_date,
                    ct.commission as price,
                    COUNT(*) as quantity,
                    SUM(ct.commission) as total_amount
                FROM checked_ticket ct
                INNER JOIN staff s ON ct.staff_id = s.id AND ct.checkin_by = s.username
                WHERE ct.date >= ?
                  AND ct.date <= ?
                  {$whereClause}
                GROUP BY
                    s.id, s.code, s.name, ct.date, ct.commission
                ORDER BY s.name ASC, ct.date ASC, ct.commission DESC
            ";

            $results = DB::select($sql, $params);

            // Tạo Excel
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();

            // Tiêu đề
            $sheet->setCellValue('A1', 'BẢNG KÊ THANH TOÁN VÉ LÁI ĐÒ V2');
            $sheet->mergeCells('A1:F1');
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
            $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

            // Khoảng thời gian
            $dateRange = Carbon::parse($fromDate)->format('d/m/Y') . ' - ' . Carbon::parse($toDate)->format('d/m/Y');
            $sheet->setCellValue('A2', 'Từ ngày: ' . $dateRange);
            $sheet->mergeCells('A2:F2');

            // Header
            $headers = ['STT', 'Mã NV', 'Tên nhân viên', 'Ngày', 'Mệnh giá', 'Số lượng', 'Thành tiền'];
            $col = 'A';
            foreach ($headers as $header) {
                $sheet->setCellValue($col . '4', $header);
                $sheet->getStyle($col . '4')->getFont()->setBold(true);
                $sheet->getStyle($col . '4')->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setARGB('FFE0E0E0');
                $col++;
            }

            // Dữ liệu
            $row = 5;
            $stt = 1;
            $currentStaffId = null;
            $totalQuantity = 0;
            $totalAmount = 0;

            foreach ($results as $item) {
                $sheet->setCellValue('A' . $row, $stt++);
                $sheet->setCellValue('B' . $row, $item->staff_code);
                $sheet->setCellValue('C' . $row, $item->staff_name);
                $sheet->setCellValue('D' . $row, Carbon::parse($item->ticket_date)->format('d/m/Y'));
                $sheet->setCellValue('E' . $row, $item->price);
                $sheet->setCellValue('F' . $row, $item->quantity);
                $sheet->setCellValue('G' . $row, $item->total_amount);

                $totalQuantity += $item->quantity;
                $totalAmount += $item->total_amount;
                $row++;
            }

            // Dòng tổng
            $sheet->setCellValue('A' . $row, '');
            $sheet->setCellValue('B' . $row, '');
            $sheet->setCellValue('C' . $row, 'TỔNG CỘNG');
            $sheet->setCellValue('D' . $row, '');
            $sheet->setCellValue('E' . $row, '');
            $sheet->setCellValue('F' . $row, $totalQuantity);
            $sheet->setCellValue('G' . $row, $totalAmount);
            $sheet->getStyle('A' . $row . ':G' . $row)->getFont()->setBold(true);
            $sheet->getStyle('A' . $row . ':G' . $row)->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FFFFF0B3');

            // Format số
            $sheet->getStyle('E5:G' . $row)->getNumberFormat()->setFormatCode('#,##0');

            // Auto size columns
            foreach (range('A', 'G') as $columnID) {
                $sheet->getColumnDimension($columnID)->setAutoSize(true);
            }

            // Border
            $sheet->getStyle('A4:G' . $row)->getBorders()->getAllBorders()
                ->setBorderStyle(Border::BORDER_THIN);

            // Output
            $filename = 'bang_ke_thanh_toan_lai_do_v2_' . date('YmdHis') . '.xlsx';
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Cache-Control: max-age=0');

            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            exit;

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }
}
