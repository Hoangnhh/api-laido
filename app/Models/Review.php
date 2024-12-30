<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    /**
     * Bảng liên kết với model
     */
    protected $table = 'reviews';

    /**
     * Các trường có thể gán giá trị
     */
    protected $fillable = [
        'staff_code',
        'customer_name', 
        'customer_phone',
        'email',
        'stars',
        'other_review',
        'note',
        'is_view'
    ];

    /**
     * Không sử dụng updated_at
     */
    public const UPDATED_AT = null;

    /**
     * Relationship với Staff
     */
    public function staff()
    {
        return $this->belongsTo(Staff::class, 'staff_code', 'code');
    }

    /**
     * Scope để lọc các review chưa xem
     */
    public function scopeUnviewed($query)
    {
        return $query->where('is_view', 0);
    }

    /**
     * Scope để lọc theo số sao
     */
    public function scopeWithStars($query, $stars)
    {
        return $query->where('stars', $stars);
    }
} 