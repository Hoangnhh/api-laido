<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GateStaffShift;
use App\Models\CheckedTicket;
use App\Models\Staff;
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

    public function getStaffReport(Request $request)
    {
        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $staffGroupId = $request->input('staff_group_id');
        $status = $request->input('status');

        $query = GateStaffShift::query()
            ->select([
                'staff.code as staff_code',
                'staff.name as staff_name',
                'staff_group.name as staff_group_name',
                'gate_staff_shift.date as date_raw',
                DB::raw("DATE_FORMAT(gate_staff_shift.date, '%d/%m/%Y') as date_display"),
                DB::raw("DATE_FORMAT(gate_staff_shift.checkin_at, '%H:%i %d/%m/%Y') as checkin_at_display"),
                DB::raw("DATE_FORMAT(gate_staff_shift.checkout_at, '%H:%i %d/%m/%Y') as checkout_at_display"),
                DB::raw("(SELECT COUNT(*) FROM checked_ticket 
                    WHERE gate_staff_shift_id = gate_staff_shift.id 
                    AND checkin_by = staff.username) as checkin_count"),
                DB::raw("(SELECT COUNT(*) FROM checked_ticket 
                    WHERE gate_staff_shift_id = gate_staff_shift.id 
                    AND checkout_by = staff.username) as checkout_count")
            ])
            ->join('staff', 'gate_staff_shift.staff_id', '=', 'staff.id')
            ->join('staff_group', 'staff.group_id', '=', 'staff_group.id');

        if ($status) {
            $query->where('gate_staff_shift.status', $status);
        }

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
                DB::raw("DATE_FORMAT(checked_ticket.issue_date, '%d/%m/%Y %H:%i') as issue_date_formatted"),
                DB::raw("DATE_FORMAT(checked_ticket.expired_date, '%d/%m/%Y %H:%i') as expired_date_formatted"),
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
}
