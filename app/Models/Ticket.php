<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    const STATUS_USED = 'ACTIVE';
    const STATUS_NOT_USED = 'INACTIVE';
    /**
     * Các trường có thể gán giá trị hàng loạt
     *
     * @var array
     */
    protected $fillable = [
        'ref_id',
        'code',
        'service_name',
        'issue_date',
        'expired_date', 
        'price',
        'status',
        'print_count',
        'created_by',
        'created_date'
    ];

    /**
     * Các trường nên được cast sang kiểu dữ liệu khác
     *
     * @var array
     */
    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'created_date' => 'datetime',
        'total_amount' => 'decimal:2',
        'print_count' => 'integer'
    ];

    /**
     * Tên bảng kết nối với model
     *
     * @var string
     */
    protected $table = 'tickets';

    /**
     * Khóa chính của bảng
     *
     * @var string
     */
    protected $primaryKey = 'id';

    /**
     * Khóa chính có tự động tăng không
     *
     * @var bool
     */
    public $incrementing = true;

    /**
     * Kiểu dữ liệu của khóa chính
     *
     * @var string
     */
    protected $keyType = 'integer';
} 