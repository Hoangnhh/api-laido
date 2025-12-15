# Hướng dẫn cấu hình Zalo Login

## Bước 1: Đăng ký ứng dụng tại Zalo Developers

1. Truy cập: https://developers.zalo.me/
2. Đăng nhập với tài khoản Zalo của bạn
3. Tạo ứng dụng **Mini App** mới (hoặc sử dụng ứng dụng có sẵn)
4. Lấy thông tin:
   - **App ID**: ID của ứng dụng
   - **Secret Key** (App Secret): Khóa bí mật của ứng dụng

**Quan trọng:** 
- ❌ **KHÔNG** cần lấy Access Token thủ công
- ✅ Access Token sẽ được **tự động lấy từ API** và cache 23 giờ
- ✅ Hệ thống tự động refresh token khi hết hạn

## Bước 2: Cấu hình biến môi trường

Thêm các dòng sau vào file `.env` của bạn:

```env
# ============================================
# ZALO CONFIGURATION
# ============================================
ZALO_APP_ID=your_zalo_app_id_here
ZALO_SECRET_KEY=your_zalo_secret_key_here

# Không cần thêm ZALO_ACCESS_TOKEN
# Access Token sẽ tự động lấy từ API:
# POST https://oauth.zaloapp.com/v4/oa/access_token
```

**Lưu ý:** Thay thế các giá trị `your_zalo_*` bằng thông tin thực tế từ Zalo Developer Portal.

## Bước 3: Test API

### Endpoint
```
POST /public_api/v1/auth/zalo-login
```

### Request Body
```json
{
  "phone": "encrypted_token_from_zalo_getPhoneNumber",
  "zalo_id": "zalo_user_id_123",
  "name": "Nguyễn Văn A",
  "avatar": "https://example.com/avatar.jpg"
}
```

**Quan trọng:** 
- `phone` là **encrypted token** từ Zalo API `getPhoneNumber()`, KHÔNG phải số điện thoại trực tiếp
- Backend sẽ tự động verify token này với Zalo API để lấy số điện thoại thật
- Số điện thoại thật sẽ được so khớp với database

### Response thành công (200)
```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
      "id": 1,
      "username": "staff001",
      "code": "NV001",
      "phone": "0123456789",
      "name": "Nguyễn Văn A",
      "type": "DRIVER",
      "group": {...}
    }
  },
  "message": "Đăng nhập thành công"
}
```

### Response lỗi - Số điện thoại chưa đăng ký (401)
```json
{
  "success": false,
  "message": "Số điện thoại chưa được đăng ký trong hệ thống",
  "data": null
}
```

### Response lỗi - Không verify được token (400)
```json
{
  "success": false,
  "message": "Không thể xác thực số điện thoại từ Zalo. Vui lòng thử lại.",
  "data": null
}
```

## Quy trình hoạt động

### 1. **Frontend gọi Zalo API** để lấy phone token
```javascript
// Trong Zalo Mini App
const token = await zalo.getPhoneNumber();
// Token này là ENCRYPTED TOKEN, không phải số điện thoại thật
```

### 2. **Frontend gửi token** đến backend
```javascript
const response = await fetch('/public_api/v1/auth/zalo-login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    phone: token,  // Encrypted token
    zalo_id: zaloUserId,
    name: userName,
    avatar: userAvatar
  })
});
```

### 3. **Backend xử lý** (tự động):

#### 3.1. Lấy Access Token
- Kiểm tra cache có token không?
- Nếu có → Dùng token từ cache
- Nếu không → Gọi API lấy token mới:
  ```
  POST https://oauth.zaloapp.com/v4/oa/access_token
  Body: app_id, app_secret, grant_type=client_credentials
  ```
- Cache token 23 giờ (token hết hạn sau 24h)

#### 3.2. Verify Phone Token
- Nhận encrypted phone token từ frontend
- Kiểm tra nếu token dài > 20 ký tự → Là token (không phải số thật)
- Gọi Zalo API để verify (thử 3 endpoint khác nhau):
  1. `GET https://graph.zalo.me/v2.0/me/info`
  2. `POST https://oauth.zaloapp.com/v4/oa/permission/phone`
  3. `POST https://openapi.zalo.me/v3.0/miniapp/phone/verify`
- Lấy số điện thoại thật từ response

#### 3.3. Xác thực và đăng nhập
- Chuẩn hóa số điện thoại (bỏ +84, 84, khoảng trắng...)
- Tìm staff trong database theo số điện thoại
- Nếu tìm thấy và status = ACTIVE → Tạo JWT token và đăng nhập
- Nếu không tìm thấy → Từ chối đăng nhập

### Sơ đồ luồng

```
Frontend (Zalo Mini App)
   ↓
[1] getPhoneNumber() 
   → Encrypted Token (dài > 20 ký tự)
   ↓
[2] POST /public_api/v1/auth/zalo-login
   → { phone: encrypted_token, ... }
   ↓
Backend (Laravel)
   ↓
[3] ZaloService: getAccessToken()
   → Check Cache
   → If expired: POST oauth.zaloapp.com/v4/oa/access_token
   → Cache 23h
   ↓
[4] ZaloService: verifyPhoneToken()
   → Try 3 API endpoints
   → Get real phone number
   ↓
[5] Normalize phone: 0123456789
   ↓
[6] Find Staff in Database
   ↓
[7] Generate JWT Token
   ↓
Response → { access_token, user }
```

## Hiểu về 2 loại Token trong Zalo Mini App

### ⚠️ RẤT QUAN TRỌNG - Hay bị nhầm lẫn!

Zalo Mini App có **2 loại token hoàn toàn khác nhau**:

| Loại Token | Lấy từ đâu | Dùng cho | Thời hạn |
|------------|-----------|----------|----------|
| **Access Token (Backend)** | API OAuth (`client_credentials`) | Backend gọi API hệ thống Zalo | 24 giờ |
| **User Access Token (Frontend)** | `zmp.getAccessToken()` | Frontend gọi API trong Mini App | Theo session |

### ❌ SAI - Những điều KHÔNG nên làm

```javascript
// ❌ SAI: Dùng frontend token cho backend
const frontendToken = await zmp.getAccessToken();
// → Token này CHỈ dùng trong Mini App, không dùng cho backend API

// ❌ SAI: Dùng Official Account Access Token
// → Mini App và OA là 2 loại ứng dụng khác nhau

// ❌ SAI: Lưu Access Token tĩnh vào .env
ZALO_ACCESS_TOKEN=abc123...
// → Token hết hạn sau 24h, phải lấy động
```

### ✅ ĐÚNG - Cách triển khai

```php
// ✅ ĐÚNG: Backend tự động lấy Access Token
public function getAccessToken(): string
{
    // 1. Check cache
    $token = Cache::get('zalo_access_token');
    if ($token) return $token;
    
    // 2. Gọi API lấy token mới
    $response = Http::asForm()->post('https://oauth.zaloapp.com/v4/oa/access_token', [
        'app_id' => $this->appId,
        'app_secret' => $this->secretKey,
        'grant_type' => 'client_credentials',  // ← Backend credentials
    ]);
    
    $token = $response->json()['access_token'];
    
    // 3. Cache 23 giờ
    Cache::put('zalo_access_token', $token, 23 * 3600);
    
    return $token;
}
```

### 📝 Tóm tắt

- **Backend** dùng `client_credentials` grant type → Access Token tự động
- **Frontend** dùng `zmp.getAccessToken()` → User token (khác hoàn toàn)
- **Hệ thống này đã xử lý tự động** → Bạn chỉ cần cấu hình `ZALO_APP_ID` và `ZALO_SECRET_KEY`

## Xử lý lỗi

### Lỗi "Phone token verification failed"
- Kiểm tra `ZALO_APP_ID`, `ZALO_SECRET_KEY`, `ZALO_ACCESS_TOKEN` trong `.env`
- Kiểm tra token có hợp lệ không
- Kiểm tra log tại `storage/logs/laravel.log`

### Lỗi "Số điện thoại chưa được đăng ký"
- Số điện thoại từ Zalo chưa tồn tại trong bảng `staff`
- Hoặc staff có status = 'INACTIVE'
- Cần tạo tài khoản staff trước hoặc cập nhật số điện thoại

## Debugging

Kiểm tra log chi tiết tại `storage/logs/laravel.log`:

```bash
tail -f storage/logs/laravel.log
```

Log sẽ hiển thị:
- Token length
- Zalo API response
- Phone verification result
- Database lookup result

## Bảo mật

⚠️ **Quan trọng:**
- **KHÔNG** commit file `.env` vào Git
- **KHÔNG** chia sẻ `ZALO_APP_ID` và `ZALO_SECRET_KEY` công khai
- Sử dụng HTTPS cho production
- Access Token tự động refresh, không cần rotate thủ công
- Phone token từ frontend chỉ dùng 1 lần, không cache

## Cache và Performance

### Access Token Cache
- **Cache Key**: `zalo_access_token`
- **TTL**: 23 giờ (token hết hạn sau 24h)
- **Driver**: Laravel Cache (file/redis/database)
- **Auto Refresh**: Tự động lấy token mới khi hết hạn

### Xóa cache thủ công (nếu cần)
```bash
php artisan cache:forget zalo_access_token
```

Hoặc trong code:
```php
app(ZaloService::class)->clearAccessToken();
```

## Liên hệ hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Zalo Developer Documentation: https://developers.zalo.me/docs
2. Laravel Log: `storage/logs/laravel.log`
3. Network tab trong browser DevTools

