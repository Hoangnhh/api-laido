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
            
            $staffs = Staff::query()
                ->withCount(['checkedTickets as checked_ticket_count'])
                ->where(function($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                })
                ->where('status', Staff::STATUS_ACTIVE)
                ->when($status === 'unpaid', function($query) {
                    $query->whereHas('checkedTickets', function($query) {
                        $query->where('paid', false);
                    });
                })
                ->when($status === 'paid', function($query) {
                    $query->whereHas('payment', function($query) {
                        $query->where('status', Payment::STATUS_ACTIVE);
                    })->whereDoesntHave('checkedTickets', function($query) {
                        $query->where('paid', false);
                    });
                })
                ->when($status === null || $status === '', function($query) {
                    // Không thêm điều kiện gì, lấy tất cả Staff
                })
                ->withCount([
                    'checkedTickets as total_commission' => function($query) {
                        $query->select(DB::raw('COALESCE(SUM(commission), 0)'))
                              ->where('paid', false);
                    },
                    'payment as total_paid' => function($query) {
                        $query->select(DB::raw('COALESCE(SUM(amount), 0)'))
                              ->where('status', Payment::STATUS_ACTIVE);
                    }
                ])
                ->having('checked_ticket_count', '>', 0)
                ->orderBy('code', 'asc')
                ->paginate($perPage);

            $data = $staffs->toArray();
            if (isset($data['data'])) {
                $data = $data['data'];
            } else {
                $data = [];
            }

            return response()->json([
                'success' => true,
                'message' => 'Lấy danh sách thành công',
                'data' => $data,
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
        $totalPaid = Payment::where('status', Payment::STATUS_ACTIVE)
            ->sum('amount');

        $totalUnpaid = Staff::with(['checkedTickets' => function($query) {
            $query->where('paid', false);
        }])->get()->sum(function($staff) {
            return $staff->checkedTickets->sum('commission');
        });

        $totalUnpaidNum = Staff::with(['checkedTickets' => function($query) {
            $query->where('paid', false);
        }])->get()->sum(function($staff) {
            return $staff->checkedTickets->count();
        });

        return response()->json([
            'total_paid' => $totalPaid,
            'total_unpaid' => $totalUnpaid,
            'total_unpaid_num' => $totalUnpaidNum
        ]);
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

            if($paymentMethod == Payment::PAYMENT_METHOD_BANK_TRANSFER && ($bank == "" || $accountNumber == "")) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng nhập đẩy đủ thông tin'
                ], 400);
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
} 