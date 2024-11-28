<?php

namespace App\Services;

use App\Models\GateShift;
use App\Models\Staff;
use App\Enums\NotificationContent;
use App\Models\GateStaffShift;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use App\Models\StaffNotification;

class NotificationService
{

    public function pushShiftNoti(int $gateStaffShiftId): void
    {
        try {
            $gateStaffShift = GateStaffShift::with(['staff', 'gate'])->findOrFail($gateStaffShiftId);
            
            $type = NotificationContent::NEW_SHIFT_ASSIGNED;
            $params = $this->prepareShiftParams($gateStaffShift);

            $gateStaffShift->staff->sendNotification(
                $type->getTitle(),
                $type->getBody($params)
            );
        } catch (\Exception $e) {
            Log::error('Error pushing shift notification: ' . $e->getMessage());
        }
    }

    public function pushShiftCancelNoti(int $gateShiftId): void
    {
        $gateShift = GateShift::with(['gateStaffShifts.staff', 'gate'])->findOrFail($gateShiftId);
        
        $type = NotificationContent::SHIFT_CANCELED;
        $params = [
            'date' => Carbon::parse($gateShift->date)->format('d/m/Y'),
            'gate' => $gateShift->gate->name
        ];

        foreach ($gateShift->gateStaffShifts as $staffShift) {
            $staffShift->staff->sendNotification(
                $type->getTitle(),
                $type->getBody($params)
            );
        }
    }

    public function pushShiftNotiForMultiple(array $gateStaffShiftIds): void
    {
        $gateStaffShifts = GateStaffShift::with(['staff', 'gate'])
            ->whereIn('id', $gateStaffShiftIds)
            ->get();

        foreach ($gateStaffShifts as $gateStaffShift) {
            $type = NotificationContent::NEW_SHIFT_ASSIGNED;
            $params = $this->prepareShiftParams($gateStaffShift);

            $gateStaffShift->staff->sendNotification(
                $type->getTitle(),
                $type->getBody($params)
            );
        }
    }

    private function prepareShiftParams(GateStaffShift $gateStaffShift): array
    {
        return [
            'date' => Carbon::parse($gateStaffShift->date)->format('d/m/Y'),
            'gate' => $gateStaffShift->gate->name,
            'index' => $gateStaffShift->index
        ];
    }

    public function getNotification(int $staffId, int $perPage = 10, int $page = 1)
    {
        $notifications = StaffNotification::where('staff_id', $staffId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->toArray();

        // Chuyển đổi created_at sang định dạng d/m/Y
        foreach ($notifications['data'] as &$notification) {
            $notification['created_at'] = Carbon::parse($notification['created_at'])->format('d/m/Y H:m');
        }

        return $notifications;
    }
    public function readNotification(int $notificationId): void
    {
        StaffNotification::findOrFail($notificationId)->update(['read_at' => Carbon::now()]);
    }
} 