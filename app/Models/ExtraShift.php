<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExtraShift extends Model
{
    const STATUS_ACTIVE = 'ACTIVE';
    const STATUS_INACTIVE = 'INACTIVE';

    protected $table = 'extra_shift';

    protected $fillable = [
        'date',
        'staff_id',
        'recheckin_times',
        'recheckin_at',
        'status',
        'create_by',
        'update_by'
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

} 