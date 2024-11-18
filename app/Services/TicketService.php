<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TicketService
{
    private $baseUrl = 'http://103.183.113.201:7963';
    
    /**
     * Gọi API sử dụng vé
     * 
     * @param string $code Mã vé
     * @param string $device Thiết bị
     * @return array
     */
    public function useTicket(string $code, string $device = 'LAIDO'): array
    {
        try {
            // Mã hóa code bằng base64
            $encodedCode = base64_encode($code);
            
            // Gọi API
            $response = Http::timeout(10)
                ->post("{$this->baseUrl}/mobile/using-ticket?code=".$encodedCode."&device=".$device, []);

            $responseData = $response->json();

            // Log response
            Log::info('UseTicket API Response', [
                'code' => $code,
                'encoded_code' => $encodedCode,
                'device' => $device,
                'status' => $response->status(),
                'body' => $responseData
            ]);

            // Kiểm tra HTTP status
            if (!$response->successful()) {
                return [
                    'success' => false,
                    'message' => 'Lỗi kết nối HTTP: ' . $response->status(),
                    'data' => $responseData
                ];
            }

            // Kiểm tra API status
            if ($responseData['status'] !== 'SUCCESS') {
                return [
                    'success' => false,
                    'message' => $responseData['value']['serverProcessMessage'] ?? 'Lỗi không xác định',
                    'data' => $responseData
                ];
            }

            // Lấy thông tin vé
            $ticket = $responseData['value']['lstTicket'][0] ?? null;
            if (!$ticket) {
                return [
                    'success' => false,
                    'message' => 'Không tìm thấy thông tin vé',
                    'data' => $responseData
                ];
            }

            // Trả về kết quả thành công
            return [
                'success' => true,
                'data' => [
                    'ticket' => [
                        'code' => $ticket['serviceCode'],
                        'service_name' => $ticket['serviceRateName'],
                        'status' => $ticket['statusStr'],
                        'expiration_date' => $ticket['expirationDate'],
                        'price' => $ticket['price'],
                        'last_using_time' => $ticket['lastUsingTime'],
                        'last_using_device' => $ticket['lastUsingACM'],
                        'booking_code' => $ticket['bookingCode'],
                        'invoice_code' => $ticket['invoiceCode'],
                    ],
                    'raw_response' => $responseData
                ],
                'message' => $responseData['value']['serverProcessMessage']
            ];

        } catch (\Exception $e) {
            Log::error('UseTicket API Error', [
                'code' => $code,
                'device' => $device,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Lỗi xử lý: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Kiểm tra xem vé có thể sử dụng không
     * 
     * @param array $ticket
     * @return bool
     */
    private function isTicketValid(array $ticket): bool
    {
        // Kiểm tra trạng thái vé
        if ($ticket['status'] === 'CLOSE') {
            return false;
        }

        // Kiểm tra hạn sử dụng
        $expirationDate = new \DateTime($ticket['expirationDate']);
        $now = new \DateTime();
        
        return $now <= $expirationDate;
    }
}
