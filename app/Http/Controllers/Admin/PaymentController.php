<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CheckedTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Staff;
use App\Models\Payment;

class PaymentController extends Controller
{
    public function getStaffPayments(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 10);
            $search = $request->input('search', '');
            $status = $request->input('status', null);

            $staffs = Staff::query()
                ->with(['checkedTickets' => function($query) {
                    $query->where('paid', false);
                }, 'payment'])
                ->where(function($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                })
                ->where('status', Staff::STATUS_ACTIVE)
                ->when($status === 'pending', function($query) {
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
                ->having('total_commission', '>', 0)
                ->orderBy('code', 'asc')
                ->paginate($perPage);

            $data = $staffs->toArray();
            if (isset($data['data'])) {
                foreach ($data['data'] as &$staff) {
                    if (isset($staff['checked_tickets'])) {
                        foreach ($staff['checked_tickets'] as &$ticket) {
                            // Format date
                            $ticket['date'] = date('d/m/Y', strtotime($ticket['created_at']));
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
                            
                            // Xóa thông tin không cần thiết
                            unset($ticket['checkin_by']);
                            unset($ticket['checkout_by']);
                        }
                    }
                }
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
        $staffId = $request->input('staff_id');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        
        $staff = Staff::find($staffId);
        $checkedTickets = CheckedTicket::where('staff_id', $staffId)
            ->whereBetween('created_at', [$fromDate, $toDate])
            ->get();

        foreach ($checkedTickets as &$ticket) {
            // Format date
            $ticket['date'] = date('d/m/Y', strtotime($ticket['created_at']));
            switch ($ticket['status']) {
                case CheckedTicket::STATUS_CHECKIN:
                    $ticket['status'] = 'Đang hoạt động';
                    break;
                case CheckedTicket::STATUS_CHECKOUT:
                    $ticket['status'] = 'Đã hoạt thành';
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

        return response()->json($checkedTickets);
    }

    public function getStaffPayment(Request $request)
    {
        $staffId = $request->input('staff_id');
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');

        $payments = Payment::where('staff_id', $staffId)
            ->whereBetween('created_at', [$fromDate, $toDate])
            ->get();

        return response()->json($payments);
    }
} 
