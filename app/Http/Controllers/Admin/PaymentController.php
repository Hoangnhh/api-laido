<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\CheckedTicket;
use App\Models\GateStaffShift;
use App\Models\Staff;
use App\Models\Payment;

class PaymentController extends Controller
{
    public function getStaffPayments(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 10);
            $search = $request->input('search', '');

            $staffs = Staff::query()
                ->with(['checkedTickets', 'payments'])
                ->where(function($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                })
                ->where('status', Staff::STATUS_ACTIVE)
                ->orderBy('code', 'asc')
                ->withCount(['checkedTickets as total_commission' => function($query) {
                    $query->select(\DB::raw('COALESCE(SUM(commission), 0)'));
                }])
                ->withCount(['payments as total_paid' => function($query) {
                    $query->select(\DB::raw('COALESCE(SUM(amount), 0)'))
                        ->where('status', Payment::STATUS_ACTIVE);
                }])
                ->paginate($perPage);

            $staffs->getCollection()->transform(function ($staff) {
                return [
                    'id' => $staff->id,
                    'code' => $staff->code,
                    'name' => $staff->name,
                    'phone' => $staff->phone,
                    'bank_name' => $staff->bank_name,
                    'bank_account' => $staff->bank_account,
                    'total_commission' => $staff->total_commission,
                    'total_paid' => $staff->total_paid,
                    'remaining_balance' => $staff->total_commission - $staff->total_paid
                ];
            });

            return response()->json([
                'success' => true,
                'message' => 'Lấy danh sách thành công',
                'data' => $staffs
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 500);
        }
    }
} 