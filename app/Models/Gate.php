<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Gate extends Model
{
    protected $table = 'gate';
    const STATUS_ACTIVE = 'ACTIVE';
    const STATUS_INACTIVE = 'INACTIVE';
    protected $fillable = [
        'name',
        'status'
    ];

    public function shifts(): HasMany
    {
        return $this->hasMany(GateShift::class);
    }

    public function extraShifts(): HasMany
    {
        return $this->hasMany(ExtraShift::class);
    }
} 