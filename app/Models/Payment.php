<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $table = 'payments';

    protected $fillable = [
        'staff_id',
        'date',
        'amount',
        'received_account',
        'status',
        'transaction_code',
        'created_by',
        'updated_by'
    ];

    protected $casts = [
        'date' => 'datetime',
        'amount' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    // Định nghĩa các trạng thái
    const STATUS_ACTIVE = 'ACTIVE';
    const STATUS_INACTIVE = 'INACTIVE';

    // Relationship với Staff
    public function staff()
    {
        return $this->belongsTo(Staff::class, 'staff_id');
    }

    public function checkedTickets()
    {
        return $this->hasMany(CheckedTicket::class);
    }
}
