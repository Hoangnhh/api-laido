<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Services\StaffService;
use Illuminate\Http\Request;

class StaffController extends Controller
{
    protected $staffService;

    public function __construct(StaffService $staffService)
    {
        $this->staffService = $staffService;
    }

    public function index(Request $request)
    {
        $perPage = $request->input('per_page', 10);
        $search = $request->input('search');
        $groupId = $request->input('group_id');
        
        $query = Staff::with('group');

        if ($groupId) {
            $query->where('group_id', $groupId);
        }

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('card_id', 'like', "%{$search}%")
                  ->orWhereHas('group', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $staffs = $query->latest()->paginate($perPage);
        
        return response()->json($staffs);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'required|unique:staff',
            'name' => 'required',
            'username' => 'required|unique:staff',
            'password' => 'required|min:6',
            'group_id' => 'required|exists:staff_groups,id',
            'card_id' => 'required|unique:staff',
            'birthdate' => 'required|date',
            'address' => 'required',
        ]);

        $staff = $this->staffService->createOrUpdate($validated);
        return response()->json($staff, 201);
    }

    public function update(Request $request, Staff $staff)
    {
        $validated = $request->validate([
            'code' => 'required|unique:staff,code,'.$staff->id,
            'name' => 'required',
            'username' => 'required|unique:staff,username,'.$staff->id,
            'password' => 'nullable|min:6',
            'group_id' => 'required|exists:staff_groups,id',
            'card_id' => 'required|unique:staff,card_id,'.$staff->id,
            'birthdate' => 'required|date',
            'address' => 'required',
        ]);

        $staff = $this->staffService->createOrUpdate($validated, $staff);
        return response()->json($staff);
    }

    public function destroy(Staff $staff)
    {
        $staff->delete();
        return response()->json(['message' => 'Xóa nhân viên thành công']);
    }

    public function toggleStatus(Staff $staff)
    {
        $staff = $this->staffService->toggleStatus($staff);
        return response()->json($staff);
    }
} 