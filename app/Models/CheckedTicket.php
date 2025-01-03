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
        'checkin_gate_id',
        'checkin_at',
        'checkout_at',
        'checkin_by',
        'checkout_by',
        'issue_date',
        'expired_date',
        'is_checkout_with_other',
        'is_checkin_with_other',
        'payment_id',
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

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function checkinBy(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'checkin_by');
    }

    public function checkoutBy(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'checkout_by');
    }
} 
