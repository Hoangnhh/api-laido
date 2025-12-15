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
     * Luồng:
     * 1. Exchange phone token (code) → User Access Token
     * 2. Use User Access Token → Get phone number
     *
     * @param string $code - Authorization code từ getPhoneNumber() của Zalo
     * @return string|null - Số điện thoại thật hoặc null nếu lỗi
     * @throws Exception
     */
    public function verifyPhoneToken(string $code): ?string
    {
        try {
            Log::info('Verifying Zalo phone token', ['code_length' => strlen($code)]);

            // Step 1: Exchange authorization code → User Access Token
            $tokenResponse = Http::asForm()->post('https://oauth.zaloapp.com/v4/access_token', [
                'app_id' => $this->appId,
                'app_secret' => $this->secretKey,
                'code' => $code,
                'grant_type' => 'authorization_code',
            ]);

            Log::info('Exchange code for access token response', [
                'status' => $tokenResponse->status(),
                'body' => $tokenResponse->body(),
                'json' => $tokenResponse->json(),
            ]);

            if (!$tokenResponse->successful()) {
                Log::error('Failed to exchange code for access token', [
                    'status' => $tokenResponse->status(),
                    'body' => $tokenResponse->body(),
                ]);
                throw new Exception('Không thể exchange authorization code thành access token');
            }

            $tokenData = $tokenResponse->json();

            if (!isset($tokenData['access_token'])) {
                Log::error('Access token not found in exchange response', [
                    'response' => $tokenData
                ]);
                throw new Exception('Access token không có trong response');
            }

            $userAccessToken = $tokenData['access_token'];

            Log::info('Got user access token', [
                'token_length' => strlen($userAccessToken),
                'expires_in' => $tokenData['expires_in'] ?? 'unknown',
            ]);

            // Step 2: Use access token to get phone number
            $phoneResponse = Http::withHeaders([
                'access_token' => $userAccessToken,
            ])->get('https://graph.zalo.me/v2.0/me/info', [
                'fields' => 'id,name,picture,phone',
            ]);

            Log::info('Get phone number response', [
                'status' => $phoneResponse->status(),
                'body' => $phoneResponse->body(),
                'json' => $phoneResponse->json(),
            ]);

            if (!$phoneResponse->successful()) {
                Log::error('Failed to get phone number', [
                    'status' => $phoneResponse->status(),
                    'body' => $phoneResponse->body(),
                ]);
                throw new Exception('Không thể lấy số điện thoại từ Zalo');
            }

            $userData = $phoneResponse->json();

            // Kiểm tra phone number trong response
            $phone = null;
            if (isset($userData['phone'])) {
                $phone = $userData['phone'];
            } elseif (isset($userData['data']['phone'])) {
                $phone = $userData['data']['phone'];
            } elseif (isset($userData['number'])) {
                $phone = $userData['number'];
            } elseif (isset($userData['data']['number'])) {
                $phone = $userData['data']['number'];
            }

            if (!$phone) {
                Log::error('Phone number not found in user data', [
                    'user_data' => $userData
                ]);
                throw new Exception('Số điện thoại không có trong response từ Zalo');
            }

            Log::info('Successfully got phone number from Zalo', [
                'phone' => substr($phone, 0, 3) . '****' . substr($phone, -3)
            ]);

            return $this->normalizePhoneNumber($phone);

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

