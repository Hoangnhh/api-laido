<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Hash;
use App\Services\FirebaseService;

class Staff extends Model
{
    protected $table = 'staff';

    const STATUS_ACTIVE = 'ACTIVE';
    const STATUS_INACTIVE = 'INACTIVE';

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
        'card_date',
        'bank_name',
        'bank_account',
        'status',
        'vehical_size',
        'phone',
        'fcm_token'
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

    public function gateStaffShifts(): HasMany
    {
        return $this->hasMany(GateStaffShift::class);
    }

    public function setPasswordAttribute($value)
    {
        $this->attributes['password'] = Hash::make($value);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(StaffNotification::class);
    }

    public function sendNotification($title, $body, $data = [])
    {
        $this->notifications()->create([
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'token' => $this->fcm_token
        ]);

        if (!$this->fcm_token) {
            return false;
        }
        $firebaseService = app(FirebaseService::class);
        return $firebaseService->sendNotification($this->fcm_token, $title, $body, $data);
    }

    public function payment(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
} 
