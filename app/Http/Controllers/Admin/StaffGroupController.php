<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\StaffGroup;
use Illuminate\Http\Request;

class StaffGroupController extends Controller
{
    public function index()
    {
        $groups = StaffGroup::all();
        return response()->json($groups);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|unique:staff_group',
            'status' => 'required|in:ACTIVE,INACTIVE'
        ]);

        $group = StaffGroup::create($validated);
        return response()->json($group, 201);
    }

    public function update(Request $request, StaffGroup $staffGroup)
    {
        $validated = $request->validate([
            'name' => 'required|unique:staff_group,name,' . $staffGroup->id,
            'status' => 'required|in:ACTIVE,INACTIVE'
        ]);

        $staffGroup->update($validated);
        return response()->json($staffGroup);
    }

    public function destroy(StaffGroup $staffGroup)
    {
        $staffGroup->delete();
        return response()->json(['message' => 'Xóa nhóm thành công']);
    }
} 