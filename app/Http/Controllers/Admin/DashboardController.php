<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Staff;
use App\Models\GateShift;
use App\Models\GateStaffShift;
use App\Models\CheckedTicket;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        // Validate và xử lý ngày tháng
        $fromDate = $request->input('fromDate') 
            ? Carbon::parse($request->input('fromDate'))->startOfDay()
            : Carbon::today()->startOfDay();
        
        $toDate = $request->input('toDate')
            ? Carbon::parse($request->input('toDate'))->endOfDay()
            : Carbon::today()->endOfDay();

        // Kiểm tra khoảng thời gian hợp lệ
        if ($fromDate->gt($toDate)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Ngày bắt đầu không thể lớn hơn ngày kết thúc'
            ], 422);
        }

        // Tổng số lái đò
        $totalStaff = Staff::where('status', Staff::STATUS_ACTIVE)->count();

        // Tổng số lái đò hoạt động (có checkin hoặc checkout)
        $activeStaffCount = Staff::whereHas('gateStaffShifts', function($query) use ($fromDate, $toDate) {
            $query->whereBetween('checkin_at', [$fromDate, $toDate])->whereNot('status', GateStaffShift::STATUS_WAITING);
        })->count();

        // Tổng số vé đã quét
        $totalCheckedTickets = CheckedTicket::whereBetween('checkin_at', [$fromDate, $toDate])
            ->select('code')
            ->distinct()->get()->count();

        // Dữ liệu biểu đồ số lượng lái đò hoạt động theo ngày
        $activeStaffByDay = GateStaffShift::whereBetween('checkin_at', [$fromDate, $toDate])
            ->whereNot('status', GateStaffShift::STATUS_WAITING)
            ->select(
                DB::raw('DATE(checkin_at) as date'),
                DB::raw('COUNT(DISTINCT staff_id) as count')
            )
            ->groupBy(DB::raw('DATE(checkin_at)'))
            ->orderBy('date')
            ->get();

        // Chuyển collection thành array với key là date (đảm bảo date là string)
        $activeStaffData = [];
        foreach ($activeStaffByDay as $item) {
            $dateStr = Carbon::parse($item->date)->format('Y-m-d');
            $activeStaffData[$dateStr] = $item->count;
        }

        // Dữ liệu biểu đồ số lượng vé đã quét theo ngày
        $checkedTicketsByDay = CheckedTicket::whereBetween('checkin_at', [$fromDate, $toDate])->where('is_checkin_with_other', false)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(DISTINCT code) as count')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // Chuyển collection thành array với key là date (đảm bảo date là string)
        $checkedTicketsData = [];
        foreach ($checkedTicketsByDay as $item) {
            $dateStr = Carbon::parse($item->date)->format('Y-m-d');
            $checkedTicketsData[$dateStr] = $item->count;
        }

        // Chuẩn hóa dữ liệu biểu đồ
        $chartData = [];
        $currentDate = clone $fromDate;
        while ($currentDate <= $toDate) {
            $dateStr = $currentDate->format('Y-m-d');
            $chartData[$dateStr] = [
                'active_staff' => (int)($activeStaffData[$dateStr] ?? 0),
                'checked_tickets' => (int)($checkedTicketsData[$dateStr] ?? 0)
            ];
            $currentDate->addDay();
        }

        $data = [
            'summary' => [
                'total_staff' => $totalStaff,
                'active_staff' => $activeStaffCount,
                'total_checked_tickets' => $totalCheckedTickets,
            ],
            'chart_data' => $chartData,
            'date_range' => [
                'from' => $fromDate->format('Y-m-d'),
                'to' => $toDate->format('Y-m-d')
            ]
        ];

        return response()->json($data);
    }

    public function getShiftStaffStats()
    {
        try {
            // Lấy tất cả ca làm việc đang chạy hoặc đã checkin all
            $activeShifts = GateShift::whereIn('queue_status', [
                GateShift::QUEUE_STATUS_RUNNING, 
                GateShift::QUEUE_STATUS_CHECKIN_ALL
            ])->pluck('id');

            // Thống kê nhân viên trong các ca active
            $staffStats = GateStaffShift::whereIn('gate_shift_id', $activeShifts)
                ->select(
                    DB::raw('COUNT(*) as total_staff'),
                    DB::raw('SUM(CASE WHEN status = "' . GateStaffShift::STATUS_CHECKOUT . '" THEN 1 ELSE 0 END) as checked_out_staff'),
                    DB::raw('SUM(CASE WHEN status != "' . GateStaffShift::STATUS_CHECKOUT . '" THEN 1 ELSE 0 END) as not_checked_out_staff')
                )
                ->first();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_staff' => (int)$staffStats->total_staff,
                    'checked_out_staff' => (int)$staffStats->checked_out_staff,
                    'not_checked_out_staff' => (int)$staffStats->not_checked_out_staff
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi lấy thông tin nhân viên: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getCheckedTicketsByGate(Request $request)
    {
        try {
            // Validate và xử lý ngày tháng
            $fromDate = $request->input('from_date') 
                ? Carbon::parse($request->input('from_date'))->startOfDay()
                : Carbon::today()->startOfDay();
            
            $toDate = $request->input('to_date')
                ? Carbon::parse($request->input('to_date'))->endOfDay()
                : Carbon::today()->endOfDay();

            // Kiểm tra khoảng thời gian hợp lệ
            if ($fromDate->gt($toDate)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ngày bắt đầu không thể lớn hơn ngày kết thúc'
                ], 422);
            }

            // Bắt đầu từ bảng gates
            $query = DB::table('gate')
                ->leftJoin('gate_shift', 'gate.id', '=', 'gate_shift.gate_id')
                ->leftJoin('gate_staff_shift', 'gate_shift.id', '=', 'gate_staff_shift.gate_shift_id')
                ->leftJoin('checked_ticket', function($join) use ($fromDate, $toDate) {
                    $join->on('gate_staff_shift.id', '=', 'checked_ticket.gate_staff_shift_id')
                        ->whereBetween('checked_ticket.checkin_at', [$fromDate, $toDate]);
                })
                ->select(
                    'gate.id as gate_id', 
                    'gate.name as gate_name',
                    DB::raw('COUNT(DISTINCT checked_ticket.code) as total_tickets')
                )
                ->groupBy('gate.id', 'gate.name');

            // Lọc theo gate_ids nếu có
            if ($request->has('gate_ids') && !empty($request->gate_ids)) {
                $gateIds = is_array($request->gate_ids) ? $request->gate_ids : [$request->gate_ids];
                $query->whereIn('gate.id', $gateIds);
            }

            $result = $query->get();

            return response()->json([
                'status' => 'success',
                'data' => $result,
                'date_range' => [
                    'from' => $fromDate->format('Y-m-d'),
                    'to' => $toDate->format('Y-m-d')
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi lấy thống kê vé: ' . $e->getMessage()
            ], 500);
        }
    }
} 