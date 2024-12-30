<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    /**
     * Hiển thị trang quản lý đánh giá
     */
    public function index()
    {
        return view('admin.reviews');
    }

    /**
     * Xuất file Excel danh sách đánh giá
     */
    public function export(Request $request)
    {
        $query = Review::with('staff');

        // Thêm các điều kiện lọc tương tự như API
        if ($request->has('staff_code')) {
            $query->where('staff_code', $request->staff_code);
        }

        if ($request->has('stars')) {
            $query->withStars($request->stars);
        }

        if ($request->has('is_view')) {
            $query->where('is_view', $request->is_view);
        }

        $reviews = $query->orderBy('created_at', 'desc')->get();

        // Logic xuất Excel ở đây
        // ...

        return back()->with('success', 'Đã xuất file Excel thành công');
    }
} 