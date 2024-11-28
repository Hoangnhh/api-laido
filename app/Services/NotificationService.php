<?php

namespace App\Services;

use App\Models\GateShift;
use App\Models\Staff;
use App\Enums\NotificationContent;
use App\Models\GateStaffShift;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

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
} 