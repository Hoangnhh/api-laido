<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gate;
use Illuminate\Http\Request;

class GateController extends Controller
{
    public function index()
    {
        $gate = Gate::orderBy('id', 'asc')->get();
        return response()->json($gate);
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:gate',
                'status' => 'required|in:ACTIVE,INACTIVE'
            ]);

            $gate = Gate::create($validated);
            return response()->json($gate, 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Có lỗi xảy ra khi thêm vị trí',
                'errors' => $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, Gate $gate)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:gate,name,'.$gate->id,
                'status' => 'required|in:ACTIVE,INACTIVE'
            ]);

            $gate->update($validated);
            return response()->json($gate);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Có lỗi xảy ra khi cập nhật vị trí',
                'errors' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy(Gate $gate)
    {
        try {
            $gate->delete();
            return response()->json(['message' => 'Xóa vị trí thành công']);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Có lỗi xảy ra khi xóa vị trí',
                'errors' => $e->getMessage()
            ], 500);
        }
    }
} 