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
                DB::raw("DATE_FORMAT(payment.date, '%d/%m/%Y') as payment_date"),
                'staff.code as staff_code',
                'staff.username as staff_username',
                'staff.name as staff_name',
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

                            // Lấy danh sách vé trực tiếp từ database
                            $tickets = CheckedTicket::select([
                                'checked_ticket.code as ticket_code',
                                'checked_ticket.name as ticket_name',
                                'checked_ticket.commission',
                                'checked_ticket.checkin_by',
                                'checked_ticket.checkout_by',
                                DB::raw("DATE_FORMAT(checked_ticket.date, '%d/%m/%Y') as ticket_date")
                            ])
                            ->where('checked_ticket.payment_id', $payment->id)
                            ->get()
                            ->map(function ($ticket, $index) use ($payment) {
                                // Xác định chiều vé
                                $direction = 'Không xác định';
                                $isCheckinByStaff = isset($ticket->checkin_by) && 
                                    $ticket->checkin_by === $payment->staff_username;
                                $isCheckoutByStaff = isset($ticket->checkout_by) && 
                                    $ticket->checkout_by === $payment->staff_username;
                                if ($isCheckinByStaff && $isCheckoutByStaff) {
                                    $direction = '2 Chiều';
                                } elseif ($isCheckinByStaff) {
                                    $direction = 'Chiều vào';
                                } elseif ($isCheckoutByStaff) {
                                    $direction = 'Chiều ra';
                                }
                            
                                return [
                                    'stt' => $index + 1,
                                    'ticket_code' => $ticket->ticket_code,
                                    'ticket_date' => $ticket->ticket_date,
                                    'ticket_name' => $ticket->ticket_name,
                                    'direction' => $direction,
                                    'commission' => $ticket->commission
                                ];
                            });
                            
                            $payment->tickets = $tickets;
                            $payment->total_commission = $tickets->sum('commission');
                            
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
            $date = $request->input('date', Carbon::today()->format('Y-m-d'));

            $result = DB::table('checked_ticket')
                ->select([
                    'checked_ticket.name as ticket_name',
                    DB::raw('COUNT(*) as total_count'),
                    DB::raw('ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM checked_ticket WHERE DATE(date) = ?)), 2) as percentage')
                ])
                ->whereDate('checked_ticket.date', $date)
                ->groupBy('checked_ticket.name')
                ->orderBy('total_count', 'desc')
                ->setBindings([$date, $date])
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
                    'date' => $date,
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

    private function formatPaymentMethod($method)
    {
        $methods = [
            Payment::PAYMENT_METHOD_BANK_TRANSFER => 'Chuyển khoản',
            Payment::PAYMENT_METHOD_CASH => 'Tiền mặt'
        ];

        return $methods[$method] ?? $method;
    }
}
