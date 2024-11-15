<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GateStaffShift extends Model
{
    protected $table = 'gate_staff_shift';
    const STATUS_WAITING = 'WAITING';
    const STATUS_CHECKIN = 'CHECKIN'; 
    const STATUS_CHECKOUT = 'CHECKOUT';
    protected $fillable = [
        'date',
        'gate_shift_id',
        'index',
        'gate_id',
        'staff_id',
        'status',
        'checkin_at',
        'checkout_at',
        'checked_ticket_num'
    ];

    protected $casts = [
        'date' => 'datetime',
        'checkin_at' => 'datetime',
        'checkout_at' => 'datetime',
        'checked_ticket_num' => 'integer',
        'index' => 'integer'
    ];

    // Relationships
    public function gateShift(): BelongsTo
    {
        return $this->belongsTo(GateShift::class);
    }

    public function gate(): BelongsTo
    {
        return $this->belongsTo(Gate::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    // Thêm relationship mới
    public function queueBefore()
    {
        return $this->hasMany(GateStaffShift::class, 'gate_shift_id', 'gate_shift_id')
            ->where('id', '<', $this->id);
    }

    // Scopes
    public function scopeWaiting($query)
    {
        return $query->where('status', 'WAITING');
    }

    public function scopeCheckedIn($query)
    {
        return $query->whereNotNull('checkin_at');
    }

    public function scopeCheckedOut($query)
    {
        return $query->whereNotNull('checkout_at');
    }

    // Accessors & Mutators
    public function getIsCheckedInAttribute(): bool
    {
        return !is_null($this->checkin_at);
    }

    public function getIsCheckedOutAttribute(): bool
    {
        return !is_null($this->checkout_at);
    }

    public function getDurationAttribute()
    {
        if ($this->checkin_at && $this->checkout_at) {
            return $this->checkout_at->diffInMinutes($this->checkin_at);
        }
        return null;
    }
} 