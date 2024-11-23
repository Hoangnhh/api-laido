<?php

namespace App\Enums;

enum SystemConfigKey: string 
{
    case CURRENT_GATE_SHIFT_ID = 'CURRENT_GATE_SHIFT_ID';
    case ENABLE_LIMIT_BY_VEHICAL_SIZE = 'ENABLE_LIMIT_BY_VEHICAL_SIZE';
    case ENABLE_CHECKIN_BY_INDEX = 'ENABLE_CHECKIN_BY_INDEX';
    case CURRENT_SHIFT_DATE = 'CURRENT_SHIFT_DATE';
    case CHECKOUT_DELAY_MINUTE = 'CHECKOUT_DELAY_MINUTE';
    case CHECKIN_TICKET_RANGE_MINUTE = 'CHECKIN_TICKET_RANGE_MINUTE';
    case ENABLE_CHECKIN_ALL_GATE = 'ENABLE_CHECKIN_ALL_GATE';

    /**
     * Lấy danh sách tất cả các key
     * @return array
     */
    public static function getAllKeys(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Kiểm tra key có hợp lệ không
     * @param string $key
     * @return bool
     */
    public static function isValidKey(string $key): bool
    {
        return in_array($key, self::getAllKeys());
    }

    /**
     * Lấy mô tả cho từng key
     * @return string
     */
    public function getDescription(): string
    {
        return match($this) {
            self::CURRENT_GATE_SHIFT_ID => 'ID của ca trực cổng hiện tại',
            self::ENABLE_LIMIT_BY_VEHICAL_SIZE => 'Giới hạn theo kích thước phương tiện',
            self::CURRENT_SHIFT_DATE => 'Ngày ca trực hiện tại',
            self::CHECKOUT_DELAY_MINUTE => 'Thời gian delay khi checkout(phút)',
            self::ENABLE_CHECKIN_BY_INDEX => 'Check-in lần lượt theo số',
            self::ENABLE_CHECKIN_ALL_GATE => 'Cho phép Lái đò Check-in tại tất cả cổng',
            self::CHECKIN_TICKET_RANGE_MINUTE => 'Thời gian cho phép checkin vé sau khi nhân viên checkin tại cổng(phút)',
        };
    }
} 