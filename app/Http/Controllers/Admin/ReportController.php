<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GateStaffShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function getWaitingList(Request $request)
    {
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $staffGroupId = $request->input('staff_group_id');

        $query = GateStaffShift::query()
            ->select([
                'staff.code as staff_code',
                'staff.name as staff_name',
                'staff_group.name as staff_group_name',
                'gate_staff_shift.date as date_raw',
                DB::raw("DATE_FORMAT(gate_staff_shift.date, '%d/%m/%Y') as date_display"),
                DB::raw("'Đang chờ' as status")
            ])
            ->join('staff', 'gate_staff_shift.staff_id', '=', 'staff.id')
            ->join('staff_group', 'staff.group_id', '=', 'staff_group.id')
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

        $result = $query->orderBy('staff.code', 'asc')->get();

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }
}
