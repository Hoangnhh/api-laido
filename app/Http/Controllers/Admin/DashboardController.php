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
        $totalStaff = Staff::count();

        // Tổng số lái đò hoạt động (có checkin hoặc checkout)
        $activeStaffCount = Staff::whereHas('gateStaffShifts', function($query) use ($fromDate, $toDate) {
            $query->whereBetween('date', [$fromDate, $toDate])
                ->whereIn('status', [GateStaffShift::STATUS_CHECKIN, GateStaffShift::STATUS_CHECKOUT]);
        })->count();

        // Số lượt chở khách
        $totalTrips = GateStaffShift::whereBetween('date', [$fromDate, $toDate])
            ->whereIn('status', [GateStaffShift::STATUS_CHECKIN, GateStaffShift::STATUS_CHECKOUT])
            ->count();

        // Tổng số vé đã quét
        $totalCheckedTickets = CheckedTicket::whereHas('gateStaffShift', function($query) use ($fromDate, $toDate) {
            $query->whereBetween('date', [$fromDate, $toDate])
                ->whereIn('status', [GateStaffShift::STATUS_CHECKIN, GateStaffShift::STATUS_CHECKOUT]);
        })->count();

        // Dữ liệu biểu đồ số lượng lái đò hoạt động theo ngày
        $activeStaffByDay = GateStaffShift::whereBetween('date', [$fromDate, $toDate])
            ->whereIn('status', [GateStaffShift::STATUS_CHECKIN, GateStaffShift::STATUS_CHECKOUT])
            ->select(
                DB::raw('DATE(date) as date'),
                DB::raw('COUNT(DISTINCT staff_id) as count')
            )
            ->groupBy(DB::raw('DATE(date)'))
            ->orderBy('date')
            ->get();

        // Chuyển collection thành array với key là date (đảm bảo date là string)
        $activeStaffData = [];
        foreach ($activeStaffByDay as $item) {
            $dateStr = Carbon::parse($item->date)->format('Y-m-d');
            $activeStaffData[$dateStr] = $item->count;
        }

        // Dữ liệu biểu đồ số lượng vé đã quét theo ngày
        $checkedTicketsByDay = CheckedTicket::whereBetween('created_at', [$fromDate, $toDate])
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('COUNT(*) as count')
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
                'total_trips' => $totalTrips,
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
} 