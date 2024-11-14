<?php

namespace App\Http\Controllers\Api\Traits;

trait ApiResponse
{
    /**
     * Success Response
     */
    protected function successResponse($data = null, $message = 'Thành công', $code = 200)
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => $message
        ], $code);
    }

    /**
     * Error Response
     */
    protected function errorResponse($message = 'Lỗi', $code = 400, $data = null)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => $data
        ], $code);
    }

    /**
     * Response with pagination
     */
    protected function paginationResponse($items, $message = 'Thành công')
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total()
            ]
        ]);
    }
} 