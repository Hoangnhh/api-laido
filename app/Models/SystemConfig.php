<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemConfig extends Model
{
    protected $table = 'system_configs';

    protected $fillable = [
        'key',
        'value',
        'status'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Constants cho status
    const STATUS_ACTIVE = 'ACTIVE';
    const STATUS_INACTIVE = 'INACTIVE';

    /**
     * Lấy giá trị config theo key
     * @param string $key
     * @return mixed|null
     */
    public static function getConfig($key)
    {
        $config = self::where('key', $key)
            ->where('status', self::STATUS_ACTIVE)
            ->first();
            
        return $config ? $config->value : null;
    }
    /**
     * Lấy giá trị config theo key
     * @param string $key
     * @return mixed|null
     */
    public static function getConfigs($keys)
    {
        $configs = self::whereIn('key', $keys)
            ->where('status', self::STATUS_ACTIVE)
            ->get();
            
        return $configs->pluck('value', 'key')->toArray();
    }

    /**
     * Set giá trị config
     * @param string $key
     * @param mixed $value
     * @return bool
     */
    public static function setConfig($key, $value)
    {
        return self::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'status' => self::STATUS_ACTIVE
            ]
        );
    }
} 