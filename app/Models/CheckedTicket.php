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
        'checkin_by',
        'checkout_by',
        'is_checkout_with_other',
        'paid',
        'price',
        'commission',
        'gate_staff_shift_id',
        'staff_id',
        'extra_shift_id'
    ];

    protected $casts = [
        'date' => 'date',
        'checkin_at' => 'datetime',
        'checkout_at' => 'datetime',
        'paid' => 'boolean',
        'commisson' => 'integer',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    public function extraShift(): BelongsTo
    {
        return $this->belongsTo(ExtraShift::class);
    }

    /**
     * Get the gate staff shift that owns the checked ticket.
     */
    public function gateStaffShift()
    {
        return $this->belongsTo(GateStaffShift::class, 'gate_staff_shift_id');
    }
} 