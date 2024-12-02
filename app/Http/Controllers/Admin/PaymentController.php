<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
                ->with(['checkedTickets', 'payment'])
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
            $currentPage = $staffs->currentPage();
            $lastPage = $staffs->lastPage();
            $total = $staffs->total();
            if (isset($data['data'])) {
                $data = $data['data'];
            } else {
                $data = [];
            }

            return response()->json([
                'success' => true,
                'message' => 'Lấy danh sách thành công',
                'data' => $data,
                'current_page' => $currentPage,
                'last_page' => $lastPage,
                'total' => $total
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
} 