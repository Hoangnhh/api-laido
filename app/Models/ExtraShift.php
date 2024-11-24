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
        'status',
        'create_by',
        'update_by'
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function gate(): BelongsTo
    {
        return $this->belongsTo(Gate::class);
    }

    public function checkedTickets(): HasMany
    {
        return $this->hasMany(CheckedTicket::class);
    }

    public function gateStaffShifts(): HasMany
    {
        return $this->hasMany(GateStaffShift::class);
    }
} 