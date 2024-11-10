<?php

namespace App\Services;

use App\Models\ExtraShift;
use App\Models\GateShift;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class ShiftService
{
    /**
     * Lấy danh sách ca làm việc theo cổng
     */
    public function getShiftsByGate(int $gateId): Collection
    {
        return GateShift::where('gate_id', $gateId)
                       ->where('status', 'ACTIVE')
                       ->get();
    }

    /**
     * Tạo ca làm việc phụ
     */
    public function createExtraShift(array $data): ExtraShift
    {
        return ExtraShift::create([
            'gate_id' => $data['gate_id'],
            'date' => $data['date'],
            'staff_id' => $data['staff_id'],
            'status' => 'WAITING'
        ]);
    }

    /**
     * Cập nhật trạng thái checkin/checkout
     */
    public function updateShiftStatus(ExtraShift $shift, string $action): ExtraShift
    {
        $now = Carbon::now();

        if ($action === 'checkin') {
            $shift->checkin_at = $now;
            $shift->status = 'WORKING';
        } elseif ($action === 'checkout') {
            $shift->checkout_at = $now;
            $shift->status = 'COMPLETED';
        }

        $shift->save();
        return $shift;
    }

    /**
     * Lấy danh sách ca làm việc phụ theo ngày
     */
    public function getExtraShiftsByDate(string $date, array $filters = []): Collection
    {
        $query = ExtraShift::where('date', $date);

        if (isset($filters['gate_id'])) {
            $query->where('gate_id', $filters['gate_id']);
        }

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        return $query->with(['staff', 'gate'])->get();
    }
} 