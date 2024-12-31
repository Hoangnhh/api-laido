<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReviewController extends Controller
{
    /**
     * Hiển thị trang quản lý đánh giá
     */
    public function index(Request $request)
    {
        try {
            $query = Review::query();

            // Xử lý ngày tháng
            $fromDate = $request->from_date ? Carbon::parse($request->from_date)->startOfDay() 
                                          : Carbon::now()->startOfMonth();
            $toDate = $request->to_date ? Carbon::parse($request->to_date)->endOfDay() 
                                      : Carbon::now()->endOfDay();

            $query->whereBetween('created_at', [$fromDate, $toDate]);

            // Lọc theo staff_code nếu có
            if ($request->has('search') && $request->search !== null) {
                $search = $request->search;
                $query->where('staff_code', 'like', "%{$search}%")
                ->orWhere('customer_name', 'like', "%{$search}%")
                ->orWhere('customer_phone', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%");
            }

            // Lọc theo số sao
            if ($request->has('stars') && $request->stars !== null) {
                $query->where('stars', $request->stars);
            }

            // Sắp xếp theo thời gian tạo mới nhất
            $query->orderBy('created_at', 'desc');

            // Phân trang
            $reviews = $query->paginate($request->per_page ?? 10);

            // Thêm thông tin bổ sung cho mỗi review
            $reviews->getCollection()->transform(function ($review) {
                $review->other_review_names = $review->getOtherReviewName();
                $review->penalty_score = $review->calculatePenaltyScore();
                return $review;
            });

            return response()->json([
                'data' => $reviews,
                'date_range' => [
                    'from_date' => $fromDate->format('Y-m-d'),
                    'to_date' => $toDate->format('Y-m-d')
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xuất file Excel danh sách đánh giá
     */
    public function export(Request $request)
    {
        try {
            $query = Review::query();

            // Xử lý ngày tháng
            $fromDate = $request->from_date ? Carbon::parse($request->from_date)->startOfDay() 
                                          : Carbon::now()->startOfMonth();
            $toDate = $request->to_date ? Carbon::parse($request->to_date)->endOfDay() 
                                      : Carbon::now()->endOfDay();

            $query->whereBetween('created_at', [$fromDate, $toDate]);

            // Áp dụng các bộ lọc
            if ($request->has('search') && $request->search !== null) {
                $search = $request->search;
                $query->where('staff_code', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            }

            if ($request->has('stars') && $request->stars !== null) {
                $query->where('stars', $request->stars);
            }

            $reviews = $query->orderBy('created_at', 'desc')->get();

            // Tạo file CSV
            $filename = 'danh-sach-danh-gia-' . date('Y-m-d-H-i-s') . '.csv';
            
            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];

            $callback = function() use ($reviews, $fromDate, $toDate) {
                $file = fopen('php://output', 'w');
                // Add BOM to fix UTF-8 in Excel
                fprintf($file, chr(0xEF).chr(0xBB).chr(0xBF));
                
                // Tiêu đề file
                fputcsv($file, ['DANH SÁCH ĐÁNH GIÁ']);
                fputcsv($file, ['Từ ngày: ' . $fromDate->format('d/m/Y') . ' - Đến ngày: ' . $toDate->format('d/m/Y')]);
                fputcsv($file, []); // Dòng trống

                // Headers
                fputcsv($file, [
                    'STT',
                    'Mã lái đò',
                    'Tên khách hàng',
                    'Số điện thoại',
                    'Email',
                    'Số sao',
                    'Nhận xét khác',
                    'Ghi chú',
                    'Thời gian'
                ]);

                // Data
                foreach ($reviews as $index => $review) {
                    fputcsv($file, [
                        $index + 1,
                        $review->staff_code,
                        $review->customer_name,
                        $review->customer_phone,
                        $review->email,
                        $review->stars,
                        $review->getOtherReviewName(),
                        $review->note,
                        Carbon::parse($review->created_at)->format('d/m/Y H:i:s')
                    ]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi khi xuất file: ' . $e->getMessage()
            ], 500);
        }
    }
} 