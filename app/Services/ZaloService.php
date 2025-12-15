<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Exception;

class ZaloService
{
    private $appId;
    private $secretKey;

    // Cache key cho access token
    private const CACHE_KEY_ACCESS_TOKEN = 'zalo_access_token';

    // Thời gian cache: 23 giờ (token hết hạn sau 24h, cache ngắn hơn để an toàn)
    private const CACHE_TTL = 23 * 60 * 60;

    public function __construct()
    {
        $this->appId = config('services.zalo.app_id');
        $this->secretKey = config('services.zalo.secret_key');

        Log::info('ZaloService initialized', [
            'has_app_id' => !empty($this->appId),
            'has_secret_key' => !empty($this->secretKey),
        ]);

        if (empty($this->appId) || empty($this->secretKey)) {
            Log::warning('Zalo config missing! Please set ZALO_APP_ID and ZALO_SECRET_KEY in .env');
        }
    }

    /**
     * Lấy Access Token (tự động cache)
     * Token được lấy từ Zalo API và cache 23 giờ
     *
     * @return string
     * @throws Exception
     */
    public function getAccessToken(): string
    {
        // Kiểm tra cache trước
        $cachedToken = Cache::get(self::CACHE_KEY_ACCESS_TOKEN);

        if ($cachedToken) {
            Log::info('Using cached Zalo access token');
            return $cachedToken;
        }

        // Nếu không có cache, gọi API để lấy token mới
        Log::info('Fetching new Zalo access token from API');

        try {
            Log::info('Calling Zalo OAuth API', [
                'app_id' => $this->appId ? 'SET' : 'NOT SET',
                'app_secret' => $this->secretKey ? 'SET' : 'NOT SET',
            ]);

            $response = Http::asForm()->post('https://oauth.zaloapp.com/v4/oa/access_token', [
                'app_id' => $this->appId,
                'app_secret' => $this->secretKey,
                'grant_type' => 'client_credentials',
            ]);

            Log::info('Zalo OAuth API response', [
                'status' => $response->status(),
                'body' => $response->body(),
                'json' => $response->json(),
            ]);

            if (!$response->successful()) {
                Log::error('Failed to get Zalo access token', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new Exception('Không thể lấy Access Token từ Zalo API');
            }

            $data = $response->json();

            if (!isset($data['access_token'])) {
                Log::error('Access token not found in response', [
                    'response_data' => $data,
                    'response_body' => $response->body(),
                ]);
                throw new Exception('Access Token không có trong response từ Zalo');
            }

            $accessToken = $data['access_token'];
            $expiresIn = $data['expires_in'] ?? 86400; // Mặc định 24h

            Log::info('Got new Zalo access token', [
                'expires_in' => $expiresIn,
                'token_length' => strlen($accessToken),
            ]);

            // Cache token (dùng thời gian ngắn hơn expires_in để an toàn)
            $cacheTTL = min(self::CACHE_TTL, $expiresIn - 3600); // Trừ 1 giờ cho an toàn
            Cache::put(self::CACHE_KEY_ACCESS_TOKEN, $accessToken, $cacheTTL);

            return $accessToken;

        } catch (Exception $e) {
            Log::error('Error getting Zalo access token', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Xóa cache access token (dùng khi token không hợp lệ)
     */
    public function clearAccessToken(): void
    {
        Cache::forget(self::CACHE_KEY_ACCESS_TOKEN);
        Log::info('Cleared Zalo access token cache');
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

            // Lấy access token (tự động cache)
            $accessToken = $this->getAccessToken();

            // Method 1: Thử gọi API user info với access token
            $response = Http::withHeaders([
                'access_token' => $accessToken,
                'Content-Type' => 'application/json',
            ])->get('https://graph.zalo.me/v2.0/me/info', [
                'code' => $token,
                'secret_key' => $this->secretKey,
            ]);

            if ($response->successful()) {
                $data = $response->json();

                Log::info('Zalo API response (method 1)', ['data' => $data]);

                // Kiểm tra các trường có thể chứa số điện thoại
                if (isset($data['data']['number'])) {
                    return $this->normalizePhoneNumber($data['data']['number']);
                }

                if (isset($data['number'])) {
                    return $this->normalizePhoneNumber($data['number']);
                }

                if (isset($data['phone'])) {
                    return $this->normalizePhoneNumber($data['phone']);
                }
            }

            // Method 2: Thử endpoint permission phone (dành cho Mini App)
            $response2 = Http::asForm()->post('https://oauth.zaloapp.com/v4/oa/permission/phone', [
                'app_id' => $this->appId,
                'secret_key' => $this->secretKey,
                'code' => $token,
            ]);

            if ($response2->successful()) {
                $data2 = $response2->json();

                Log::info('Zalo OAuth API response (method 2)', ['data' => $data2]);

                if (isset($data2['data']['number'])) {
                    return $this->normalizePhoneNumber($data2['data']['number']);
                }

                if (isset($data2['number'])) {
                    return $this->normalizePhoneNumber($data2['number']);
                }
            }

            // Method 3: Thử endpoint openapi với Authorization Bearer
            $response3 = Http::withHeaders([
                'Authorization' => 'Bearer ' . $accessToken,
                'Content-Type' => 'application/json',
            ])->post('https://openapi.zalo.me/v3.0/miniapp/phone/verify', [
                'code' => $token,
            ]);

            if ($response3->successful()) {
                $data3 = $response3->json();

                Log::info('Zalo OpenAPI response (method 3)', ['data' => $data3]);

                if (isset($data3['data']['number'])) {
                    return $this->normalizePhoneNumber($data3['data']['number']);
                }

                if (isset($data3['number'])) {
                    return $this->normalizePhoneNumber($data3['number']);
                }
            }

            // Log tất cả response để debug
            Log::error('All Zalo API methods failed', [
                'method1_status' => $response->status(),
                'method1_body' => $response->body(),
                'method2_status' => $response2->status(),
                'method2_body' => $response2->body(),
                'method3_status' => $response3->status(),
                'method3_body' => $response3->body(),
            ]);

            // Nếu lỗi 401 (Unauthorized), xóa cache token và thử lại
            if ($response->status() === 401 || $response3->status() === 401) {
                Log::warning('Access token might be expired, clearing cache');
                $this->clearAccessToken();
            }

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

