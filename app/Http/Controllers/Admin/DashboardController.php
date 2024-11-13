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

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();
        
        // Tổng số lái đò
        $totalStaff = Staff::where('status', Staff::STATUS_ACTIVE)->count();

        // Số lái đò được phân ca hôm nay
        $assignedStaffToday = GateStaffShift::whereDate('date', $today)
            ->distinct('staff_id')
            ->count();

        // Số lái đò đang checkin và đang chờ
        $staffStatus = GateStaffShift::whereDate('date', $today)
            ->whereHas('gateShift', function($query) {
                $query->where('status', GateShift::STATUS_ACTIVE)
                    ->where('queue_status', GateShift::QUEUE_STATUS_RUNNING);
            })
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Tối ưu dữ liệu checkin theo giờ
        $checkinData = GateStaffShift::whereDate('checkin_at', $today)
            ->where('status', GateStaffShift::STATUS_CHECKIN)
            ->select(
                DB::raw('HOUR(checkin_at) as hour'),
                DB::raw('COUNT(*) as count')
            )
            ->groupBy('hour')
            ->orderBy('hour')
            ->get();

        // Nếu có dữ liệu
        if ($checkinData->isNotEmpty()) {
            // Lấy giờ đầu và cuối có dữ liệu
            $minHour = $checkinData->min('hour');
            $maxHour = $checkinData->max('hour');
            
            // Thêm 1 giờ trước và sau để biểu đồ đẹp hơn
            $startHour = max(0, $minHour - 1);
            $endHour = min(23, $maxHour + 1);

            // Tạo mảng dữ liệu trong khoảng giờ có ý nghĩa
            $hourlyCheckins = collect(range($startHour, $endHour))
                ->mapWithKeys(function ($hour) use ($checkinData) {
                    $count = $checkinData->firstWhere('hour', $hour)?->count ?? 0;
                    return [$hour => $count];
                });
        } else {
            // Nếu không có dữ liệu, chỉ trả về giờ hiện tại và 2 giờ liền kề
            $currentHour = Carbon::now()->hour;
            $startHour = max(0, $currentHour - 1);
            $endHour = min(23, $currentHour + 1);
            
            $hourlyCheckins = collect(range($startHour, $endHour))
                ->mapWithKeys(function ($hour) {
                    return [$hour => 0];
                });
        }

        // Lấy 5 vé gần đây nhất
        $recentTickets = CheckedTicket::with(['staff:id,name,code', 'gate:id,name'])
            ->latest()
            ->take(5)
            ->get()
            ->map(function ($ticket) {
                return [
                    'id' => $ticket->id,
                    'staff_name' => $ticket->staff->name,
                    'staff_code' => $ticket->staff->code,
                    'gate_name' => $ticket->gate->name,
                    'created_at' => $ticket->created_at->format('H:i:s d/m/Y')
                ];
            });

        $data = [
            'totalStaff' => $totalStaff,
            'assignedStaffToday' => $assignedStaffToday,
            'checkinStaff' => $staffStatus[GateStaffShift::STATUS_CHECKIN] ?? 0,
            'waitingStaff' => $staffStatus[GateStaffShift::STATUS_WAITING] ?? 0,
            'hourlyCheckins' => $hourlyCheckins,
            'recentTickets' => $recentTickets,
        ];

        return response()->json($data);
    }
} 