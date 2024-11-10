<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StaffGroup extends Model
{
    protected $table = 'staff_group';

    protected $fillable = [
        'name',
        'status'
    ];

    public function staff(): HasMany
    {
        return $this->hasMany(Staff::class, 'group_id');
    }
} 