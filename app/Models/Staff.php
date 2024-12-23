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
    const VEHICAL_TYPE_DO = 1;
    const VEHICAL_TYPE_XUONG = 2;

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
        'vehical_type',
        'phone',
        'fcm_token',
        'default_gate_id'
    ];

    protected $casts = [
        'birthdate' => 'date',
        'vehical_size' => 'integer',
        'vehical_type' => 'integer'
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

    public function gate(): BelongsTo
    {
        return $this->belongsTo(Gate::class, 'default_gate_id');
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

    public static function getVehicalTypeName($type){
        switch ($type) {
            case self::VEHICAL_TYPE_DO:
                return 'Đò';
            case self::VEHICAL_TYPE_XUONG:
                return 'Xuồng';
            default:
                return 'Không rõ';
        }
    }
} 

