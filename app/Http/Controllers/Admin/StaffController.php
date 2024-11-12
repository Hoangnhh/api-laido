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
        $status = $request->input('status');
        
        $query = Staff::with('group');

        if ($groupId) {
            $query->where('group_id', $groupId);
        }

        if ($status) {
            $query->where('status', $status);
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
        try {
            // Kiểm tra username và code trước
            $existingStaff = Staff::where('username', $request->username)
                ->orWhere('code', $request->code)
                ->first();

            if ($existingStaff) {
                $errors = [];
                if ($existingStaff->username === $request->username) {
                    $errors['username'] = 'Username đã được sử dụng';
                }
                if ($existingStaff->code === $request->code) {
                    $errors['code'] = 'Mã nhân viên đã tồn tại';
                }
                return response()->json(['errors' => $errors], 422);
            }

            $validated = $request->validate([
                'code' => 'required|unique:staff',
                'name' => 'required',
                'username' => 'required|unique:staff',
                'password' => 'required|min:6',
                'group_id' => 'required|exists:staff_group,id',
                'card_id' => 'required|unique:staff',
                'birthdate' => 'required|date',
                'address' => 'required',
                'avatar' => 'nullable|image|max:2048',
                'vehical_size' => 'required|integer|min:0',
                'phone' => 'required|size:10|unique:staff'
            ]);

            if ($request->hasFile('avatar')) {
                $path = $request->file('avatar')->store('avatars', 'public');
                $validated['avatar_url'] = '/storage/' . $path;
            }

            $staff = $this->staffService->createOrUpdate($validated);
            return response()->json($staff, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Có lỗi xảy ra khi tạo nhân viên'], 500);
        }
    }

    public function update(Request $request, Staff $staff)
    {
        try {
            // Kiểm tra username và code trùng, ngoại trừ bản ghi hiện tại
            $existingStaff = Staff::where(function($query) use ($request) {
                    $query->where('username', $request->username)
                          ->orWhere('code', $request->code);
                })
                ->where('id', '!=', $staff->id)
                ->first();

            if ($existingStaff) {
                $errors = [];
                if ($existingStaff->username === $request->username) {
                    $errors['username'] = 'Username đã được sử dụng';
                }
                if ($existingStaff->code === $request->code) {
                    $errors['code'] = 'Mã nhân viên đã tồn tại';
                }
                return response()->json(['errors' => $errors], 422);
            }

            $rules = [
                'code' => 'required|unique:staff,code,'.$staff->id,
                'name' => 'required',
                'username' => 'required|unique:staff,username,'.$staff->id,
                'group_id' => 'required|exists:staff_group,id',
                'card_id' => 'required|unique:staff,card_id,'.$staff->id,
                'birthdate' => 'required|date',
                'address' => 'required',
                'phone' => 'required|size:10|unique:staff,phone,'.$staff->id,
                'avatar' => 'nullable|image|max:2048'
            ];

            if ($request->filled('password')) {
                $rules['password'] = 'min:6';
            }

            $validated = $request->validate($rules);

            if ($request->hasFile('avatar')) {
                $path = $request->file('avatar')->store('avatars', 'public');
                $validated['avatar_url'] = '/storage/' . $path;
            }

            $staff = $this->staffService->createOrUpdate($validated, $staff);
            return response()->json($staff);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Có lỗi xảy ra khi cập nhật nhân viên'], 500);
        }
    }

    public function toggleStatus(Staff $staff)
    {
        try {
            $staff->status = $staff->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            $staff->save();
            
            return response()->json([
                'message' => 'Cập nhật trạng thái thành công',
                'staff' => $staff
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi khi cập nhật trạng thái'
            ], 500);
        }
    }

    public function getStaffsByGroup($groupId)
    {
        try {
            $staffs = Staff::where('group_id', $groupId)->where('status', 'ACTIVE')
                          ->select('id', 'name', 'code', 'group_id')
                          ->orderBy('id')
                          ->get();

            return response()->json([
                'status' => 'success',
                'data' => $staffs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi lấy danh sách nhân viên'
            ], 500);
        }
    }

    public function search(Request $request)
    {
        try {
            $code = $request->query('code');
            $staff = Staff::with('group')
                         ->where('code', $code)
                         ->first();
                         
            if (!$staff) {
                return response()->json(['message' => 'Không tìm thấy nhân viên'], 404);
            }
            
            return response()->json($staff);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Có lỗi xảy ra khi tìm kiếm nhân viên'], 500);
        }
    }
} 