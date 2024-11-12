<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GateShift extends Model
{
    protected $table = 'gate_shift';

    protected $fillable = [
        'date',
        'staff_group_id',
        'gate_id',
        'current_index',
        'status'
    ];

    protected $casts = [
        'current_index' => 'integer'
    ];

    public function gate(): BelongsTo
    {
        return $this->belongsTo(Gate::class);
    }

    public function staffGroup(): BelongsTo
    {
        return $this->belongsTo(StaffGroup::class);
    }

    public function gateStaffShifts(): HasMany
    {
        return $this->hasMany(GateStaffShift::class, 'gate_shift_id');
    }
} 