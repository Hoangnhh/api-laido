<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActionLog extends Model
{
    /**
     * Tên bảng
     */
    protected $table = 'action_logs';
    public const ACTION_CREATE = 'CREATE';
    public const ACTION_UPDATE = 'UPDATE';
    public const ACTION_DELETE = 'DELETE';

    /**
     * Không sử dụng timestamps mặc định của Laravel
     */
    public $timestamps = false;

    /**
     * Các trường có thể gán giá trị hàng loạt
     */
    protected $fillable = [
        'action',
        'table',
        'before_data',
        'after_data',
        'create_by',
        'create_at'
    ];

    /**
     * Các trường được cast sang kiểu dữ liệu khác
     */
    protected $casts = [
        'before_data' => 'array',
        'after_data' => 'array',
        'create_at' => 'datetime'
    ];
} 