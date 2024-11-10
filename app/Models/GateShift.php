<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GateShift extends Model
{
    protected $table = 'gate_shift';

    protected $fillable = [
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
} 