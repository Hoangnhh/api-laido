<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CheckedTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\Staff;
use App\Models\Payment;
use Carbon\Carbon;
use App\Services\NotificationService;
use App\Models\ActionLog;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use Illuminate\Support\Facades\Cache;

class PaymentController extends Controller
{
    public function __construct(
        private NotificationService $notificationService
    ) {}

    public function getStaffPayments(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 10);
            $search = $request->input('search', '');
            $status = $request->input('status', null);
            
            // Tạo query builder cơ bản
            $query = Staff::query()
                ->select([
                    'staff.*',
                    DB::raw('COUNT(DISTINCT ct.id) as checked_ticket_count'),
                    DB::raw('COALESCE(SUM(CASE WHEN ct.paid = 0 THEN ct.commission ELSE 0 END), 0) as total_commission'),
                    DB::raw('(SELECT COALESCE(SUM(amount), 0) FROM payment WHERE staff_id = staff.id) as total_paid')
                ])
                ->leftJoin('checked_ticket as ct', 'staff.id', '=', 'ct.staff_id')
                ->where('staff.status', Staff::STATUS_ACTIVE);

            // dd($query->toSql());
            // Thêm điều kiện tìm kiếm
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('staff.name', 'like', "%{$search}%")
                        ->orWhere('staff.code', 'like', "%{$search}%")
                        ->orWhere('staff.phone', 'like', "%{$search}%");
                });
            }

            // Thêm điều kiện lọc theo trạng thái
            if ($status === 'unpaid') {
                $query->whereExists(function ($q) {
                    $q->select(DB::raw(1))
                        ->from('checked_ticket')
                        ->whereColumn('checked_ticket.staff_id', 'staff.id')
                        ->where('checked_ticket.paid', false);
                });
            } elseif ($status === 'paid') {
                $query->whereExists(function ($q) {
                    $q->select(DB::raw(1))
                        ->from('payment')
                        ->whereColumn('payment.staff_id', 'staff.id')
                        ->where('payment.status', Payment::STATUS_ACTIVE);
                })->whereNotExists(function ($q) {
                    $q->select(DB::raw(1))
                        ->from('checked_ticket')
                        ->whereColumn('checked_ticket.staff_id', 'staff.id')
                        ->where('checked_ticket.paid', false);
                });
            }

            // Group by và having để lọc các staff có vé
            $query->groupBy('staff.id')
                ->having('checked_ticket_count', '>', 0)
                ->orderBy('staff.code', 'asc');

            // Thực hiện phân trang
            $staffs = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'message' => 'Lấy danh sách thành công',
                'data' => $staffs->items(),
                'current_page' => $staffs->currentPage(),
                'last_page' => $staffs->lastPage(),
                'total' => $staffs->total()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getPaymentSummary()
    {
        try {
            // Sử dụng single query với subquery để tối ưu hiệu năng
            $summary = DB::table('staff')
                ->select([
                    DB::raw('(SELECT COALESCE(SUM(amount), 0) FROM payment WHERE status = "'.Payment::STATUS_ACTIVE.'") as total_paid'),
                    DB::raw('(SELECT COALESCE(SUM(commission), 0) FROM checked_ticket WHERE paid = 0) as total_unpaid'),
                    DB::raw('(SELECT COUNT(*) FROM checked_ticket WHERE paid = 0) as total_unpaid_num')
                ])
                ->first();

            return response()->json([
                'total_paid' => $summary->total_paid,
                'total_unpaid' => $summary->total_unpaid,
                'total_unpaid_num' => $summary->total_unpaid_num    
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getCheckedTicketsByStaff(Request $request)
    {
        try {   
            $staffId = $request->input('staff_id');
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $status = $request->input('status');
            $fromDate = date('Y-m-d 00:00:00', strtotime($fromDate));
            $toDate = date('Y-m-d 23:59:59', strtotime($toDate));
            $search = $request->input('search');
            $staff = Staff::find($staffId);
            $checkedTickets = CheckedTicket::where('staff_id', $staffId)
                ->with('payment')
                ->whereBetween('created_at', [$fromDate, $toDate]);
            if ($status != "") {
                $checkedTickets->where('paid', $status == '1');
            }

            if ($search != "") {
                $checkedTickets->where('code', 'like', "%{$search}%");
            }

            $checkedTickets = $checkedTickets->get()->toArray();
            foreach ($checkedTickets as &$ticket) {
                // Format date
                $ticket['date1'] = $ticket['date'];
                $ticket['date'] = Carbon::parse($ticket['date'])
                    ->setTimezone('Asia/Ho_Chi_Minh')
                    ->format('d/m/Y');
                switch ($ticket['status']) {
                    case CheckedTicket::STATUS_CHECKIN:
                        $ticket['status'] = 'Chưa hoàn thành';
                        break;
                    case CheckedTicket::STATUS_CHECKOUT:
                        $ticket['status'] = 'Đã hoàn thành';
                        break;
                }

                // Xác định chiều vé
                $direction = 'Không xác định';
                $isCheckinByStaff = isset($ticket['checkin_by']) && 
                    $ticket['checkin_by'] === $staff['username'];
                $isCheckoutByStaff = isset($ticket['checkout_by']) && 
                    $ticket['checkout_by'] === $staff['username'];
                if ($isCheckinByStaff && $isCheckoutByStaff) {
                    $direction = '2 Chiều';
                } elseif ($isCheckinByStaff) {
                    $direction = 'Chiều vào';
                } elseif ($isCheckoutByStaff) {
                    $direction = 'Chiều ra';
                }
            
                $ticket['direction'] = $direction;
            }

            return response()->json([
                'success' => true,
                'message' => 'Lấy danh sách thành công',
                'data' => $checkedTickets
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getStaffPayment(Request $request)
    {
        try {
            $staffId = $request->input('staff_id');
            $fromDate = $request->input('from_date');
            $toDate = $request->input('to_date');
            $paymentMethod = $request->input('payment_method');
            $search = $request->input('search');
            
            $fromDate = date('Y-m-d 00:00:00', strtotime($fromDate));
            $toDate = date('Y-m-d 23:59:59', strtotime($toDate));

            $payments = Payment::where('staff_id', $staffId)
                ->where('status', Payment::STATUS_ACTIVE)
                ->whereBetween('created_at', [$fromDate, $toDate])
                ->when($paymentMethod != "", function($query) use ($paymentMethod) {
                    $query->where('payment_method', $paymentMethod);
                })
                ->when($search != "", function($query) use ($search) {
                    $query->where('transaction_code', 'like', "%{$search}%")
                        ->orWhere('received_account', 'like', "%{$search}%");
                })
                ->get();
            $payments = $payments->toArray();
            foreach ($payments as &$payment) {
                $payment['date'] = Carbon::parse($payment['date'])
                    ->setTimezone('Asia/Ho_Chi_Minh')
                    ->format('d/m/Y');
                
                // Lấy danh sách checked_ticket cho payment này
                // Lấy thông tin staff
                $staff = Staff::find($payment['staff_id']);
                
                // Lấy danh sách vé đã check và xác định hướng di chuyển
                $checkedTickets = CheckedTicket::where('payment_id', $payment['id'])
                    ->get()
                    ->map(function($ticket) use ($staff) {
                        $ticket = $ticket->toArray();
                        $ticket['date'] = Carbon::parse($ticket['date'])
                            ->setTimezone('Asia/Ho_Chi_Minh')
                            ->format('d/m/Y');
                        
                        // Xác định chiều vé dựa trên người check
                        $isCheckinByStaff = isset($ticket['checkin_by']) && $ticket['checkin_by'] === $staff->username;
                        $isCheckoutByStaff = isset($ticket['checkout_by']) && $ticket['checkout_by'] === $staff->username;
                        
                        if ($isCheckinByStaff && $isCheckoutByStaff) {
                            $ticket['direction'] = '2 Chiều';
                        } elseif ($isCheckinByStaff) {
                            $ticket['direction'] = 'Chiều vào';
                        } elseif ($isCheckoutByStaff) {
                            $ticket['direction'] = 'Chiều ra';
                        } else {
                            $ticket['direction'] = 'Không xác định';
                        }
                        
                        return $ticket;
                    })
                    ->toArray();
                    
                $payment['checked_tickets'] = $checkedTickets;
            }

            return response()->json([
                'success' => true,
                'message' => 'Lấy danh sách thành công',
                'data' => $payments
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function createPayment(Request $request)
    {
        try {
            $staffId = $request->input('staff_id');
            $date = $request->input('date');
            $bank = $request->input('bank');
            $accountNumber = $request->input('account_number');
            $amount = $request->input('amount');
            $note = $request->input('note');
            $ticketIds = $request->input('ticket_ids');
            $paymentMethod = $request->input('payment_method');

            if ($paymentMethod == "") {
                $paymentMethod = Payment::PAYMENT_METHOD_BANK_TRANSFER;
            }else{
                if ($paymentMethod != Payment::PAYMENT_METHOD_CASH && $paymentMethod != Payment::PAYMENT_METHOD_BANK_TRANSFER) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Phương thức thanh toán không hợp lệ'
                    ], 400);
                }
            }

            if ($staffId == "" || $date == "" || $amount == "") {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập đẩy đủ thông tin'
                ], 400);
            }
            
            DB::beginTransaction();

            // Kiểm tra các ticket đã thanh toán
            $paidTickets = CheckedTicket::whereIn('id', $ticketIds)
                ->where('paid', true)
                ->get();

            if ($paidTickets->count() > 0) {
                $paidTicketCodes = $paidTickets->pluck('code')->implode(', ');
                return response()->json([
                    'success' => false,
                    'message' => "Các vé sau đã được thanh toán: $paidTicketCodes"
                ], 400);
            }

            $transactionCode = $this->generateTransactionCode();
            $payment = Payment::create([
                'staff_id' => $staffId,
                'date' => $date,
                'transaction_code' => $transactionCode,
                'bank' => $bank,
                'received_account' => $accountNumber,
                'amount' => $amount,
                'note' => $note,
                'status' => Payment::STATUS_ACTIVE,
                'payment_method' => $paymentMethod,
                'created_by' => Auth::user()->username,
            ]);

            CheckedTicket::whereIn('id', $ticketIds)->update([
                'paid' => true,
                'payment_id' => $payment->id
            ]);
            DB::commit();

            $this->notificationService->pushPaymentNoti($payment->id);

            return response()->json([
                'success' => true,
                'message' => 'Tạo thanh toán thành công',
                'data' => $payment
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function deletePayment(Request $request)
    {
        $paymentId = $request->input('payment_id');
        $reason = $request->input('reason');

        try {
            $payment = Payment::find($paymentId);
            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không tìm thấy thanh toán'
                ], 404);
            }

            DB::beginTransaction();

            ActionLog::create([
                'action' => ActionLog::ACTION_DELETE,
                'table' => 'payment',
                'before_data' => $payment->toArray(),
                'after_data' => null,
                'create_by' => Auth::user()->username
            ]);

            CheckedTicket::where('payment_id', $payment->id)->update([
                'paid' => false,
                'payment_id' => null
            ]);

            $payment->update([
                'status' => Payment::STATUS_INACTIVE,
                'delete_reason' => $reason,
                'updated_by' => Auth::user()->username
            ]);

            DB::commit();

            $this->notificationService->pushPaymentCancelNoti($payment->id);
            return response()->json([
                'success' => true,
                'message' => 'Xóa thanh toán thành công'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function generateTransactionCode()
    {
        return 'TT' . date('Ymd') . rand(10000, 99999);
    }

    public function getPaymentAllData(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 20);
            $page = $request->input('page', 1);

            $query = Staff::query()
                ->leftJoin('checked_ticket', function($join) {
                    $join->on('staff.id', '=', 'checked_ticket.staff_id')
                        ->where('checked_ticket.paid', '=', 0)
                        ->where('checked_ticket.status', '=', CheckedTicket::STATUS_CHECKOUT);
                })
                ->select([
                    'staff.id',
                    'staff.code',
                    'staff.name',
                    'staff.card_id',
                    'staff.bank_account',
                    'staff.bank_name',
                    DB::raw('COUNT(checked_ticket.id) as unpaid_ticket_count'),
                    DB::raw('COALESCE(SUM(checked_ticket.commission), 0) as total_unpaid_amount')
                ])
                ->groupBy([
                    'staff.id',
                    'staff.code',
                    'staff.name',
                    'staff.card_id',
                    'staff.bank_account',
                    'staff.bank_name'
                ]);

            // Chỉ lấy những nhân viên có số tiền chưa thanh toán > 0
            $query->having('total_unpaid_amount', '>', 0);

            // Sắp xếp theo số tiền chưa thanh toán giảm dần
            $query->orderBy('total_unpaid_amount', 'desc');

            // Cache kết quả trong 5 phút
            $cacheKey = 'payment_all_data_' . $page . '_' . $perPage;
            $result = Cache::remember($cacheKey, 300, function() use ($query, $perPage, $page) {
                return $query->paginate($perPage, ['*'], 'page', $page);
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'items' => $result->items(),
                    'pagination' => [
                        'current_page' => $result->currentPage(),
                        'last_page' => $result->lastPage(),
                        'per_page' => $result->perPage(),
                        'total' => $result->total()
                    ]
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
     * Xuất dữ liệu thanh toán ra file Excel
     */
    private function exportPaymentToExcel($staffPayments, $fromDate = null)
    {
        $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        
        // Set font chữ mặc định
        $spreadsheet->getDefaultStyle()->getFont()->setName('Times New Roman')->setSize(11);
        
        // Thiết lập tiêu đề
        $sheet->mergeCells('A1:J1');
        $sheet->setCellValue('A1', 'DANH SÁCH THANH TOÁN');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        
        // Thiết lập ngày thanh toán
        $sheet->mergeCells('A2:J2');
        $sheet->setCellValue('A2', 'Ngày thanh toán: ' . ($fromDate ? date('d/m/Y', strtotime($fromDate)) : date('d/m/Y')));
        $sheet->getStyle('A2')->getAlignment()->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        // Headers
        $headers = [
            'STT',
            'Mã nhân viên',
            'Tên nhân viên',
            'CCCD',
            'Số tài khoản',
            'Ngân hàng',
            'Số vé thanh toán',
            'Số tiền thanh toán',
            'Mã giao dịch',
            'Thời gian'
        ];

        // Thiết lập headers
        foreach ($headers as $idx => $header) {
            $col = chr(65 + $idx); // A, B, C, ...
            $sheet->setCellValue($col . '4', $header);
            $sheet->getStyle($col . '4')->getFont()->setBold(true);
            $sheet->getStyle($col . '4')->getFill()
                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                ->getStartColor()->setRGB('CCCCCC');
        }

        // Đổ dữ liệu
        $row = 5;
        foreach ($staffPayments as $index => $payment) {
            $sheet->setCellValue('A' . $row, $index + 1);
            $sheet->setCellValue('B' . $row, $payment['staff_code']);
            $sheet->setCellValue('C' . $row, $payment['staff_name']);
            $sheet->setCellValue('D' . $row, $payment['card_id']);
            $sheet->setCellValue('E' . $row, $payment['bank_account']);
            $sheet->setCellValue('F' . $row, $payment['bank_name']);
            $sheet->setCellValue('G' . $row, $payment['ticket_count']);
            $sheet->setCellValue('H' . $row, $payment['amount']);
            $sheet->setCellValue('I' . $row, $payment['transaction_code']);
            $sheet->setCellValue('J' . $row, date('d/m/Y H:i:s', strtotime($payment['created_at'])));

            // Format số tiền
            $sheet->getStyle('H' . $row)->getNumberFormat()
                ->setFormatCode('#,##0');
            
            $row++;
        }

        // Thiết lập độ rộng cột tự động
        foreach (range('A', 'J') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Tạo border cho toàn bộ bảng
        $lastRow = $row - 1;
        $sheet->getStyle('A4:J' . $lastRow)->getBorders()->getAllBorders()
            ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN);

        // Căn giữa các cột STT, Mã NV, CCCD, Số vé
        $sheet->getStyle('A4:A' . $lastRow)->getAlignment()
            ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('B4:B' . $lastRow)->getAlignment()
            ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('D4:D' . $lastRow)->getAlignment()
            ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle('G4:G' . $lastRow)->getAlignment()
            ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER);

        // Căn phải cột số tiền
        $sheet->getStyle('H4:H' . $lastRow)->getAlignment()
            ->setHorizontal(\PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_RIGHT);

        // Tạo writer
        $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
        
        // Tạo response
        $filename = 'thanh-toan-' . date('Y-m-d-H-i-s') . '.xlsx';
        header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        header('Content-Disposition: attachment;filename="' . $filename . '"');
        header('Cache-Control: max-age=0');

        // Trả về callback để stream file
        return [
            function() use ($writer) {
                $writer->save('php://output');
            },
            []
        ];
    }

    public function createPaymentAll(Request $request)
    {
        try {
            // Lấy danh sách nhân viên có commission chưa thanh toán
            $staffWithUnpaidCommission = Staff::select([
                'staff.id',
                'staff.code',
                'staff.name',
                'staff.card_id',
                'staff.bank_account',
                'staff.bank_name',
                DB::raw('(
                    SELECT COUNT(*)
                    FROM checked_ticket
                    WHERE checked_ticket.staff_id = staff.id
                    AND checked_ticket.paid = 0
                    AND checked_ticket.status = "' . CheckedTicket::STATUS_CHECKOUT . '"
                ) as unpaid_ticket_count'),
                DB::raw('(
                    SELECT SUM(commission)
                    FROM checked_ticket
                    WHERE checked_ticket.staff_id = staff.id
                    AND checked_ticket.paid = 0
                    AND checked_ticket.status = "' . CheckedTicket::STATUS_CHECKOUT . '"
                ) as total_unpaid_amount')
            ])
            ->havingRaw('total_unpaid_amount > 0')
            ->get();

            if ($staffWithUnpaidCommission->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không có nhân viên nào cần thanh toán'
                ]);
            }

            $paymentDate = date('Y-m-d H:i:s');
            $staffPayments = [];
            $user = Auth::user();

            DB::beginTransaction();
            try {
                foreach ($staffWithUnpaidCommission as $staff) {
                    // Lấy danh sách vé chưa thanh toán
                    $unpaidTickets = CheckedTicket::where('staff_id', $staff->id)
                        ->where('paid', 0)
                        ->where('status', CheckedTicket::STATUS_CHECKOUT)
                        ->get();

                    if ($unpaidTickets->isNotEmpty()) {
                        $transactionCode = $this->generateTransactionCode();
                        
                        // Tạo payment record
                        $payment = new Payment([
                            'staff_id' => $staff->id,
                            'amount' => $staff->total_unpaid_amount,
                            'transaction_code' => $transactionCode,
                            'created_by' => $user->username,
                            'updated_by' => $user->username
                        ]);
                        $payment->save();

                        // Cập nhật trạng thái đã thanh toán cho các vé
                        CheckedTicket::where('staff_id', $staff->id)
                            ->where('paid', 0)
                            ->where('status', CheckedTicket::STATUS_CHECKOUT)
                            ->update([
                                'paid' => 1,
                                'payment_id' => $payment->id,
                                'updated_by' => $user->username
                            ]);

                        // Thêm vào danh sách để xuất Excel
                        $staffPayments[] = [
                            'staff_code' => $staff->code,
                            'staff_name' => $staff->name,
                            'card_id' => $staff->card_id,
                            'bank_account' => $staff->bank_account,
                            'bank_name' => $staff->bank_name,
                            'ticket_count' => $unpaidTickets->count(),
                            'amount' => $staff->total_unpaid_amount,
                            'transaction_code' => $transactionCode,
                            'created_at' => $paymentDate
                        ];
                    }
                }

                DB::commit();

                // Xuất file Excel
                list($callback, $headers) = $this->exportPaymentToExcel($staffPayments, $paymentDate);
                
                return response()->stream($callback, 200, $headers);

            } catch (\Exception $e) {
                DB::rollback();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }
} 