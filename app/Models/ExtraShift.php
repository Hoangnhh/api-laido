<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExtraShift extends Model
{
    protected $table = 'extra_shift';

    protected $fillable = [
        'gate_id',
        'date',
        'staff_id',
        'checkin_at',
        'checkout_at',
        'status'
    ];

    protected $casts = [
        'date' => 'date',
        'checkin_at' => 'datetime',
        'checkout_at' => 'datetime'
    ];

    public function gate(): BelongsTo
    {
        return $this->belongsTo(Gate::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    public function checkedTickets(): HasMany
    {
        return $this->hasMany(CheckedTicket::class);
    }
} 