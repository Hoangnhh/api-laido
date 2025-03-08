<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Services\StaffService;
use Illuminate\Http\Request;
use App\Models\GateStaffShift;
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
        $vehicalType = $request->input('vehical_type');
        $defaultGateId = $request->input('default_gate_id');
        
        $query = Staff::with('group');

        if ($groupId) {
            $query->where('group_id', $groupId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($vehicalType) {
            $query->where('vehical_type', $vehicalType);
        }

        if ($defaultGateId) {
            $query->where('default_gate_id', $defaultGateId);
        }

        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('card_id', 'like', "%{$search}%")
                  ->orWhere('bank_account', 'like', "%{$search}%")
                  ->orWhereHas('group', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $staffs = $query->latest()->paginate($perPage);

        foreach($staffs as $staff) {
            $staff->vehical_type_name = Staff::getVehicalTypeName($staff->vehical_type);
        }
        
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
                $message = '';
                if ($existingStaff->username === $request->username) {
                    $message = 'Username đã được sử dụng';
                }
                if ($existingStaff->code === $request->code) {
                    $message = 'Mã nhân viên đã tồn tại';
                }
                return response()->json(['message' => $message], 500);
            }

            $validated = $request->validate([
                'code' => 'required|unique:staff',
                'name' => 'required',
                'username' => 'required|unique:staff',
                'password' => 'required|min:6',
                'group_id' => 'required|exists:staff_group,id',
                'card_id' => 'required|unique:staff',
                'bank_name' => 'required',
                'bank_account' => 'required',
                'card_date' => 'required',
                'birthdate' => 'required|date',
                'address' => 'required',
                'avatar' => 'nullable|image|max:2048',
                'vehical_size' => 'required|integer|min:0',
                'vehical_type' => 'required|integer|min:0',
                'phone' => 'required|size:10|unique:staff',
                'default_gate_id' => 'nullable'
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
                if ($existingStaff->username === $request->username) {
                    $message = 'Username đã được sử dụng';
                }
                if ($existingStaff->code === $request->code) {
                    $message = 'Mã nhân viên đã tồn tại';
                }
                return response()->json(['message' => $message], 500);
            }

            $rules = [
                'code' => 'required|unique:staff,code,'.$staff->id,
                'name' => 'required',
                'username' => 'required|unique:staff,username,'.$staff->id,
                'group_id' => 'required|exists:staff_group,id',
                'card_id' => 'required|unique:staff,card_id,'.$staff->id,
                'bank_name' => 'required',
                'bank_account' => 'required',
                'card_date' => 'required',
                'birthdate' => 'required|date',
                'address' => 'required',
                'phone' => 'required|size:10|unique:staff,phone,'.$staff->id,
                'vehical_size' => 'required|integer|min:0',
                'vehical_type' => 'required|integer|min:0',
                'avatar' => 'nullable|image|max:2048',
                'default_gate_id' => 'required'
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

    public function changeGate(Request $request)
    {
        try {
            $validated = $request->validate([
                'staff_list' => 'required|array',
                'staff_list.*' => 'exists:staff,id',
                'from_gate_shift_id' => 'required|exists:gate_shift,id',
                'target_gate_shift_id' => 'required|exists:gate_shift,id'
            ]);

            \DB::beginTransaction();
            try {
                // Cập nhật gate_shift_id cho các nhân viên được chọn
                $updatedCount = GateStaffShift::where('gate_shift_id', $validated['from_gate_shift_id'])
                    ->whereIn('staff_id', $validated['staff_list'])
                    ->where('status', GateStaffShift::STATUS_WAITING) // Chỉ cho phép chuyển những nhân viên chưa check-in
                    ->update([
                        'gate_shift_id' => $validated['target_gate_shift_id']
                    ]);

                \DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Đã chuyển ' . $updatedCount . ' nhân viên sang cổng mới',
                    'data' => [
                        'updated_count' => $updatedCount
                    ]
                ]);

            } catch (\Exception $e) {
                \DB::rollBack();
                throw $e;
            }
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi chuyển cổng cho nhân viên: ' . $e->getMessage()
            ], 500);
        }
    }

} 