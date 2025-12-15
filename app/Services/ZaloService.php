<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class ZaloService
{
    private $appId;
    private $secretKey;
    private $accessToken;

    public function __construct()
    {
        $this->appId = config('services.zalo.app_id');
        $this->secretKey = config('services.zalo.secret_key');
        $this->accessToken = config('services.zalo.access_token');
    }

    /**
     * Verify phone token với Zalo API để lấy số điện thoại thật
     *
     * @param string $token - Token từ getPhoneNumber() của Zalo
     * @return string|null - Số điện thoại thật hoặc null nếu lỗi
     * @throws Exception
     */
    public function verifyPhoneToken(string $token): ?string
    {
        try {
            Log::info('Verifying Zalo phone token', ['token_length' => strlen($token)]);

            // Gọi Zalo API để verify token và lấy số điện thoại
            // Endpoint có thể thay đổi tùy theo version API của Zalo
            $response = Http::withHeaders([
                'access_token' => $this->accessToken,
                'Content-Type' => 'application/json',
            ])->get('https://graph.zalo.me/v2.0/me/info', [
                'code' => $token,
                'secret_key' => $this->secretKey,
            ]);

            if ($response->successful()) {
                $data = $response->json();

                Log::info('Zalo API response', ['data' => $data]);

                // Kiểm tra các trường có thể chứa số điện thoại
                if (isset($data['data']['number'])) {
                    return $data['data']['number'];
                }

                if (isset($data['number'])) {
                    return $data['number'];
                }

                if (isset($data['phone'])) {
                    return $data['phone'];
                }

                Log::error('Phone number not found in Zalo response', ['response' => $data]);
                throw new Exception('Không tìm thấy số điện thoại trong response từ Zalo');
            }

            // Thử endpoint khác nếu endpoint đầu tiên không thành công
            $response2 = Http::asJson()->post('https://oauth.zaloapp.com/v4/oa/permission/phone', [
                'app_id' => $this->appId,
                'secret_key' => $this->secretKey,
                'code' => $token,
            ]);

            if ($response2->successful()) {
                $data = $response2->json();

                Log::info('Zalo OAuth API response', ['data' => $data]);

                if (isset($data['data']['number'])) {
                    return $data['data']['number'];
                }

                if (isset($data['number'])) {
                    return $data['number'];
                }
            }

            Log::error('Zalo API error', [
                'status' => $response->status(),
                'body' => $response->body(),
                'status2' => $response2->status(),
                'body2' => $response2->body(),
            ]);

            throw new Exception('Không thể xác thực số điện thoại từ Zalo API');

        } catch (Exception $e) {
            Log::error('Verify phone token error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Kiểm tra xem chuỗi có phải là token hay không
     * Token thường dài hơn 20 ký tự
     *
     * @param string $value
     * @return bool
     */
    public function isPhoneToken(string $value): bool
    {
        // Token từ Zalo thường dài hơn 20 ký tự và chứa các ký tự đặc biệt
        // Số điện thoại thật thường ngắn hơn và chỉ chứa số
        return strlen($value) > 20;
    }

    /**
     * Chuẩn hóa số điện thoại (bỏ khoảng trắng, ký tự đặc biệt)
     *
     * @param string $phone
     * @return string
     */
    public function normalizePhoneNumber(string $phone): string
    {
        // Bỏ khoảng trắng, dấu gạch ngang, dấu ngoặc
        $phone = preg_replace('/[\s\-\(\)]/', '', $phone);

        // Nếu bắt đầu bằng +84, chuyển thành 0
        if (strpos($phone, '+84') === 0) {
            $phone = '0' . substr($phone, 3);
        }

        // Nếu bắt đầu bằng 84, chuyển thành 0
        if (strpos($phone, '84') === 0) {
            $phone = '0' . substr($phone, 2);
        }

        return $phone;
    }
}

