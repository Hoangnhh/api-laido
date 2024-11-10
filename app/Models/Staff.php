<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Staff extends Model
{
    protected $table = 'staff';

    protected $fillable = [
        'type',
        'group_id',
        'code',
        'name',
        'username',
        'password',
        'birthdate',
        'address',
        'avatar_url',
        'card_id',
        'status',
        'vehical_size',
        'phone'
    ];

    protected $casts = [
        'birthdate' => 'date',
        'vehical_size' => 'integer'
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(StaffGroup::class, 'group_id');
    }

    public function extraShifts(): HasMany
    {
        return $this->hasMany(ExtraShift::class);
    }

    public function checkedTickets(): HasMany
    {
        return $this->hasMany(CheckedTicket::class);
    }
} 