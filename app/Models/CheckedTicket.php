<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckedTicket extends Model
{
    protected $table = 'checked_ticket';
    public const STATUS_CHECKIN = 'CHECKIN';
    public const STATUS_CHECKOUT = 'CHECKOUT';

    protected $fillable = [
        'code',
        'name',
        'status',
        'date',
        'checkin_at',
        'checkout_at',
        'paid',
        'price',
        'commission',
        'shift_gate_staff_id',
        'staff_id',
        'extra_shift_id'
    ];

    protected $casts = [
        'date' => 'date',
        'checkin_at' => 'datetime',
        'checkout_at' => 'datetime',
        'paid' => 'boolean',
        'commisson' => 'integer'
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    public function extraShift(): BelongsTo
    {
        return $this->belongsTo(ExtraShift::class);
    }
} 