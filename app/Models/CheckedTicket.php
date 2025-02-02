<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckedTicket extends Model
{
    protected $table = 'checked_ticket';
    public const STATUS_CHECKIN = 'CHECKIN';
    public const STATUS_CHECKOUT = 'CHECKOUT';

    protected $fillable = [
        'code',
        'name',
        'status',
        'date',
        'checkin_gate_id',
        'checkin_at',
        'checkout_at',
        'checkin_by',
        'checkout_by',
        'issue_date',
        'expired_date',
        'is_checkout_with_other',
        'is_checkin_with_other',
        'payment_id',
        'paid',
        'price',
        'commission',
        'gate_staff_shift_id',
        'staff_id',
        'extra_shift_id'
    ];

    protected $casts = [
        'date' => 'date',
        'checkin_at' => 'datetime',
        'checkout_at' => 'datetime',
        'paid' => 'boolean',
        'commisson' => 'integer',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    public function extraShift(): BelongsTo
    {
        return $this->belongsTo(ExtraShift::class);
    }

    /**
     * Get the gate staff shift that owns the checked ticket.
     */
    public function gateStaffShift()
    {
        return $this->belongsTo(GateStaffShift::class, 'gate_staff_shift_id');
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function checkinBy(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'checkin_by');
    }

    public function checkoutBy(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'checkout_by');
    }

    public static function getTicketsByStaffToday($staff_id, $date = null)
    {
        $tickets = CheckedTicket::where('staff_id', $staff_id)
            ->whereDate('date', $date ?? today())
            ->orderBy('checkin_at', 'desc')
            ->get();

        $staff = Staff::find($staff_id);
        $staffUsername = $staff->username;

        $totalTicketIn = $tickets->where('checkin_by', $staffUsername)->count();
        $totalTicketOut = $tickets->where('checkout_by', $staffUsername)->count();

        return [
            'data' => $tickets->map(function($ticket) {
                return [
                    'id' => $ticket->id,
                    'code' => $ticket->code,
                    'name' => $ticket->name,
                    'status' => $ticket->status,
                    'checkin_at' => $ticket->checkin_at?->format('H:i:s'),
                    'checkout_at' => $ticket->checkout_at?->format('H:i:s'),
                    'checkin_by' => $ticket->checkin_by,
                    'checkout_by' => $ticket->checkout_by,
                    'price' => $ticket->price,
                    'commission' => $ticket->commission,
                    'paid' => $ticket->paid,
                    'is_checkout_with_other' => $ticket->is_checkout_with_other
                ];
            }),
            'total_ticket_in' => $totalTicketIn,
            'total_ticket_out' => $totalTicketOut
        ];
    }
} 
