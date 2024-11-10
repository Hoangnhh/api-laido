<?php

namespace App\Services;

use App\Models\Staff;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class StaffService
{
    /**
     * Lấy danh sách nhân viên có phân trang
     */
    public function getPaginatedStaff(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        $query = Staff::with('group');

        // Lọc theo type
        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        // Lọc theo group
        if (isset($filters['group_id'])) {
            $query->where('group_id', $filters['group_id']);
        }

        // Lọc theo status
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // Tìm kiếm theo tên hoặc mã
        if (isset($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('name', 'like', "%{$filters['search']}%")
                  ->orWhere('code', 'like', "%{$filters['search']}%");
            });
        }

        return $query->latest()->paginate($perPage);
    }

    /**
     * Tạo hoặc cập nhật nhân viên
     */
    public function createOrUpdate(array $data, ?Staff $staff = null): Staff
    {
        if ($staff && empty($data['password'])) {
            unset($data['password']);
        } else if (isset($data['password'])) {
            $data['password'] = bcrypt($data['password']);
        }

        if ($staff) {
            $staff->update($data);
            return $staff;
        }

        return Staff::create($data);
    }

    /**
     * Lấy danh sách nhân viên theo nhóm
     */
    public function getStaffByGroup(int $groupId): Collection
    {
        return Staff::where('group_id', $groupId)
                   ->where('status', 'ACTIVE')
                   ->get();
    }

    /**
     * Thay đổi trạng thái nhân viên
     */
    public function toggleStatus(Staff $staff): Staff
    {
        $staff->status = $staff->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        $staff->save();
        
        return $staff;
    }
} 