<?php

namespace App\Notifications;

use App\Models\Staff;

class GeneralNotification
{
    public static function sendToStaff(Staff $staff, $title, $body, $data = [])
    {
        return $staff->sendNotification($title, $body, $data);
    }

    public static function sendToMultipleStaff($staffIds, $title, $body, $data = [])
    {
        $staff = Staff::whereIn('id', $staffIds)
            ->whereNotNull('fcm_token')
            ->get();

        foreach ($staff as $s) {
            $s->sendNotification($title, $body, $data);
        }
    }
} 