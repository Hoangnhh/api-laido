<?php

namespace App\Enums;

enum SystemConfigKey: string 
{
    case CURRENT_GATE_SHIFT_ID = 'CURRENT_GATE_SHIFT_ID';
    case LIMIT_BY_VEHICAL_SIZE = 'LIMIT_BY_VEHICAL_SIZE';
    case CURRENT_SHIFT_DATE = 'CURRENT_SHIFT_DATE';

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
            self::LIMIT_BY_VEHICAL_SIZE => 'Giới hạn theo kích thước phương tiện',
        };
    }
} 