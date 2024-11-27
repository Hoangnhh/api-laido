<?php

namespace App\Enums;

enum NotificationContent: string
{
    case NEW_SHIFT_ASSIGNED = 'shift_assigned';
    case SHIFT_CANCELED = 'shift_canceled';

    public function getTitle(): string
    {
        return match($this) {
            self::NEW_SHIFT_ASSIGNED => 'Bạn có ca làm việc mới',
            self::SHIFT_CANCELED => 'Ca làm việc của bạn đã bị hủy',
        };
    }

    public function getBody(array $params = []): string
    {
        return match($this) {
            self::NEW_SHIFT_ASSIGNED => sprintf(
                'Bạn có ca làm việc mới ngày %s tại %s , số thứ tự %s',
                $params['date'] ?? '',
                $params['gate'] ?? '',
                $params['index'] ?? ''
            ),
            self::SHIFT_CANCELED => sprintf(
                'Ca làm việc của bạn ngày %s tại %s đã bị hủy',
                $params['date'] ?? '',
                $params['gate'] ?? ''
            ),
        };
    }
} 