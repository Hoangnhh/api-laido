<?php

namespace App\Services;

use App\Models\GateShift;
use App\Models\Staff;
use App\Enums\NotificationContent;
use App\Models\GateStaffShift;
use Illuminate\Support\Carbon;

class NotificationService
{

    public function pushShiftNoti(int $gateShiftId): void
    {
        $gateShift = GateShift::with(['gateStaffShifts.staff', 'gate'])->findOrFail($gateShiftId);
        
        $type = NotificationContent::NEW_SHIFT_ASSIGNED;
        $params = $this->prepareShiftParams($gateShift);

        foreach ($gateShift->gateStaffShifts as $staffShift) {
            $staffShift->staff->sendNotification(
                $type->getTitle(),
                $type->getBody($params)
            );
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

    public function pushShiftNotiForMultiple(array $gateShiftIds): void
    {
        $gateShifts = GateShift::with(['gateStaffShifts.staff', 'gate'])
            ->whereIn('id', $gateShiftIds)
            ->get();

        foreach ($gateShifts as $gateShift) {
            $type = NotificationContent::NEW_SHIFT_ASSIGNED;
            $params = $this->prepareShiftParams($gateShift);
            $data = $this->prepareShiftData($gateShift, $type);

            foreach ($gateShift->gateStaffShifts as $staffShift) {
                $staffShift->staff->sendNotification(
                    $type->getTitle(),
                    $type->getBody($params),
                    $data
                );
            }
        }
    }

    private function prepareShiftParams(GateShift $gateShift): array
    {
        return [
            'date' => Carbon::parse($gateShift->date)->format('d/m/Y'),
            'gate' => $gateShift->gate->name,
            'index' => $gateShift->index
        ];
    }

    private function prepareShiftData(GateShift $gateShift, NotificationContent $type): array
    {
        return [
            'gate_shift_id' => $gateShift->id,
            'gate_id' => $gateShift->gate_id,
            'type' => $type->value
        ];
    }
} 