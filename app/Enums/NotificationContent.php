<?php

namespace App\Enums;

enum NotificationContent: string
{
    case NEW_SHIFT_ASSIGNED = 'shift_assigned';
    case SHIFT_CANCELED = 'shift_canceled';
    case NEW_PAYMENT = 'new_payment';
    case PAYMENT_CANCELLED = 'payment_cancelled';

    public function getTitle(): string
    {
        return match($this) {
            self::NEW_SHIFT_ASSIGNED => 'Bạn có ca làm việc mới',
            self::SHIFT_CANCELED => 'Ca làm việc của bạn đã bị hủy',
            self::NEW_PAYMENT => 'Bạn có hóa đơn thanh toán mới',
            self::PAYMENT_CANCELLED => 'Hóa đơn thanh toán của bạn đã bị hủy',
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
            self::NEW_PAYMENT => sprintf(
                'Mã thanh toán %s với thông tin: Tổng số tiền %s, Cho %s vé bằng hình thức %s',
                $params['code'] ?? '',
                number_format($params['amount'] ?? 0, 0, ',', '.'),
                $params['ticket_count'] ?? '',
                $params['payment_method'] ?? ''
            ),
            self::PAYMENT_CANCELLED => sprintf(
                'Hóa đơn thanh toán %s đã bị hủy',
                $params['code'] ?? ''
            ),
        };
    }
} 