<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffNotification extends Model
{
    protected $fillable = [
        'staff_id',
        'title',
        'body',
        'data',
        'read_at',
        'token'
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
        'token' => 'string'
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }
} 