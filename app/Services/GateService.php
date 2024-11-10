<?php

namespace App\Services;

use App\Models\Gate;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class GateService
{
    /**
     * Lấy danh sách cổng có phân trang
     */
    public function getPaginatedGates(int $perPage = 10, array $filters = []): LengthAwarePaginator
    {
        $query = Gate::query();

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['search'])) {
            $query->where('name', 'like', "%{$filters['search']}%");
        }

        return $query->latest()->paginate($perPage);
    }

    /**
     * Tạo hoặc cập nhật cổng
     */
    public function createOrUpdate(array $data, ?Gate $gate = null): Gate
    {
        if (!$gate) {
            $gate = new Gate();
        }

        $gate->fill($data);
        $gate->save();

        return $gate;
    }

    /**
     * Lấy danh sách cổng đang hoạt động
     */
    public function getActiveGates(): Collection
    {
        return Gate::where('status', 'ACTIVE')->get();
    }
} 