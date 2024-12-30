<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\Traits\ApiResponse;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    use ApiResponse;

    /**
     * Lấy danh sách đánh giá
     */
    public function index(Request $request)
    {
        try {
            $query = Review::with('staff');

            // Lọc theo staff_code nếu có
            if ($request->has('staff_code')) {
                $query->where('staff_code', $request->staff_code);
            }

            // Lọc theo số sao
            if ($request->has('stars')) {
                $query->withStars($request->stars);
            }

            // Lọc theo trạng thái xem
            if ($request->has('is_view')) {
                $query->where('is_view', $request->is_view);
            }

            // Tìm kiếm theo tên khách hàng hoặc số điện thoại
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('customer_name', 'like', "%{$search}%")
                      ->orWhere('customer_phone', 'like', "%{$search}%");
                });
            }

            $reviews = $query->orderBy('created_at', 'desc')
                           ->paginate($request->per_page ?? 10);

            return $this->successResponse($reviews);
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Tạo đánh giá mới
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'staff_code' => 'required|exists:staffs,code',
                'customer_name' => 'required|max:200',
                'customer_phone' => 'required|max:45',
                'email' => 'nullable|email|max:45',
                'stars' => 'required|integer|min:1|max:5',
                'other_review' => 'nullable|string',
                'note' => 'nullable|string'
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $review = Review::create($request->all());

            return $this->successResponse($review, 'Đánh giá đã được tạo thành công');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Cập nhật trạng thái đã xem
     */
    public function markAsViewed($id)
    {
        try {
            $review = Review::findOrFail($id);
            $review->update(['is_view' => 1]);

            return $this->successResponse($review, 'Đã cập nhật trạng thái xem');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }

    /**
     * Xóa đánh giá
     */
    public function destroy($id)
    {
        try {
            $review = Review::findOrFail($id);
            $review->delete();

            return $this->successResponse(null, 'Đã xóa đánh giá');
        } catch (\Exception $e) {
            return $this->errorResponse($e->getMessage());
        }
    }
} 