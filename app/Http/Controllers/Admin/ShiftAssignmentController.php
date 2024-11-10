<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Gate;
use App\Models\StaffGroup;
use Illuminate\Http\Request;

class ShiftAssignmentController extends Controller
{
    public function getData()
    {
        $gates = Gate::select('id', 'name')->orderBy('id')->get();
        $staffGroups = StaffGroup::select('id', 'name')
                                ->withCount('staffs')
                                ->orderBy('name')
                                ->get();

        return response()->json([
            'gates' => $gates,
            'shifts' => $staffGroups
        ]);
    }
} 