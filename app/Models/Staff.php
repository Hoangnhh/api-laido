<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Hash;
use App\Services\FirebaseService;
use Exception;

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
        'zalo_id',
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
        'is_master',
        'phone',
        'fcm_token',
        'default_gate_id'
    ];

    protected $casts = [
        'birthdate' => 'date',
        'vehical_size' => 'integer',
        'vehical_type' => 'integer',
        'is_master' => 'integer'
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

    /**
     * Thay đổi mật khẩu cho nhân viên
     * 
     * @param string $oldPasswordBase64 Mật khẩu cũ (đã mã hóa base64)
     * @param string $newPasswordBase64 Mật khẩu mới (đã mã hóa base64)
     * @param string $confirmPasswordBase64 Xác nhận mật khẩu mới (đã mã hóa base64)
     * @return array
     * @throws Exception
     */
    public function changePassword(string $oldPasswordBase64, string $newPasswordBase64, string $confirmPasswordBase64): array
    {
        try {
            // Giải mã base64
            $oldPassword = base64_decode($oldPasswordBase64);
            $newPassword = base64_decode($newPasswordBase64);
            $confirmPassword = base64_decode($confirmPasswordBase64);

            // Kiểm tra mật khẩu cũ
            if (!Hash::check($oldPassword, $this->password)) {
                throw new Exception('Mật khẩu cũ không chính xác');
            }

            // Kiểm tra mật khẩu mới và xác nhận mật khẩu
            if ($newPassword !== $confirmPassword) {
                throw new Exception('Mật khẩu mới và xác nhận mật khẩu không khớp');
            }

            // Kiểm tra độ dài mật khẩu mới (tối thiểu 6 ký tự)
            if (strlen($newPassword) < 6) {
                throw new Exception('Mật khẩu mới phải có ít nhất 6 ký tự');
            }

            // Kiểm tra mật khẩu mới không được trùng với mật khẩu cũ
            if (Hash::check($newPassword, $this->password)) {
                throw new Exception('Mật khẩu mới không được trùng với mật khẩu cũ');
            }

            // Cập nhật mật khẩu mới
            $this->password = $newPassword;
            $this->save();

            return [
                'success' => true,
                'message' => 'Thay đổi mật khẩu thành công'
            ];

        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
} 

