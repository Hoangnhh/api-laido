<?php

namespace App\Services;

use App\Models\GateShift;
use App\Models\Staff;
use App\Enums\NotificationContent;
use App\Models\GateStaffShift;
use App\Models\Payment;
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
    public function pushPaymentNoti(int $paymentId): void
    {
        try {
            $payment = Payment::findOrFail($paymentId);
            $ticketCount = $payment->checkedTickets()->count();
            
            $type = NotificationContent::NEW_PAYMENT;   
            $paymentMethod = match($payment->payment_method) {
                Payment::PAYMENT_METHOD_CASH => 'Tiền mặt',
                Payment::PAYMENT_METHOD_BANK_TRANSFER => 'Chuyển khoản',
            };
            $params = [
                'code' => $payment->transaction_code,
                'amount' => $payment->amount,
                'ticket_count' => $ticketCount,
                'payment_method' => $paymentMethod
            ];

            $payment->staff->sendNotification(
                $type->getTitle(),
                $type->getBody($params)
            );
        } catch (\Exception $e) {
            Log::error('Error pushing shift notification: ' . $e->getMessage());
        }
    }

    public function pushPaymentCancelNoti(int $paymentId): void
    {
        try {
            $payment = Payment::findOrFail($paymentId);
            $type = NotificationContent::PAYMENT_CANCELLED;
            $params = [
                'code' => $payment->transaction_code
            ];

            $payment->staff->sendNotification(
                $type->getTitle(),
                $type->getBody($params)
            );
        } catch (\Exception $e) {
            Log::error('Error pushing payment cancel notification: ' . $e->getMessage());
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
            $notification['created_at'] = Carbon::parse($notification['created_at'])->format('d/m/Y H:i');
        }

        return $notifications;
    }
    public function readNotification(int $notificationId): void
    {
        StaffNotification::findOrFail($notificationId)->update(['read_at' => Carbon::now()]);
    }
    public function readAllNotification(int $staffId): void
    {
        StaffNotification::where('staff_id', $staffId)->update(['read_at' => Carbon::now()]);
    }
} 