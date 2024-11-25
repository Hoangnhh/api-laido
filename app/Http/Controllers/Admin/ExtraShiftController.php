<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Staff;
use App\Models\ExtraShift;
use App\Models\GateStaffShift;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class ExtraShiftController extends Controller
{
    public function createUpdateExtraShift(Request $request)
    {
        try {
            // Validate đầu vào
            $request->validate([
                'date' => 'required|date',
                'staffIds' => 'required|array',
                'staffIds.*' => 'exists:staff,id',
                'groupId' => 'required|exists:staff_group,id'
            ]);

            $date = Carbon::parse($request->date)->startOfDay();
            $today = Carbon::now()->startOfDay();

            // Kiểm tra ngày không được là quá khứ
            if ($date->lt($today)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Không thể tạo ca bổ sung cho ngày trong quá khứ'
                ], 400);
            }

            DB::beginTransaction();
            try {
                // Lấy danh sách các ca bổ sung hiện có trong ngày của group được chọn
                $existingShifts = ExtraShift::whereDate('date', $date)
                    ->where('status', ExtraShift::STATUS_ACTIVE)
                    ->whereHas('staff', function($query) use ($request) {
                        $query->where('group_id', $request->groupId);
                    })
                    ->get();

                // Cập nhật status thành INACTIVE cho các ca bổ sung của nhân viên không có trong danh sách mới
                $existingShifts->whereNotIn('staff_id', $request->staffIds)
                    ->each(function ($shift) {
                        $shift->update([
                            'status' => ExtraShift::STATUS_INACTIVE,
                            'update_by' => auth()->user()->username
                        ]);
                    });

                // Cập nhật hoặc tạo mới ca bổ sung cho từng nhân viên
                foreach ($request->staffIds as $staffId) {
                    ExtraShift::updateOrCreate(
                        [
                            'date' => $date,
                            'staff_id' => $staffId,
                        ],
                        [
                            'status' => ExtraShift::STATUS_ACTIVE,
                            'create_by' => auth()->user()->username,
                            'update_by' => auth()->user()->username
                        ]
                    );
                }

                DB::commit();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Cập nhật ca bổ sung thành công'
                ]);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getExtraStaffsByGroup(Request $request)
    {
        try {
            $date = $request->query('date');
            $groupId = $request->query('groupId');
            
            if (!$date) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Ngày không được để trống'
                ], 422);
            }

            // Lấy tất cả nhân viên trong group
            $staffs = Staff::where('group_id', $groupId)
                ->where('status', Staff::STATUS_ACTIVE)
                // Load extra shifts cho ngày được chọn
                ->with(['extraShifts' => function($query) use ($date) {
                    $query->whereDate('date', $date)
                        ->where('status', ExtraShift::STATUS_ACTIVE);
                }])
                ->get()
                ->map(function($staff) {
                    $extraShift = $staff->extraShifts->first();
                    return [
                        'id' => $staff->id,
                        'name' => $staff->name,
                        'code' => $staff->code,
                        // Chỉ trả về thông tin extra_shift nếu có
                        'extra_shift' => $extraShift ? [
                            'id' => $extraShift->id,
                            'date' => $extraShift->date->format('Y-m-d'),
                            'status' => $extraShift->status,
                            'recheckin_times' => $extraShift->recheckin_times,
                            'recheckin_at' => $extraShift->recheckin_at
                        ] : null
                    ];
                });

            return response()->json([
                'status' => 'success',
                'staffs' => $staffs
            ]);
        
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Có lỗi xảy ra khi lấy danh sách nhân viên',
                'error' => $e->getMessage()
            ], 500);
        }
    }
} 