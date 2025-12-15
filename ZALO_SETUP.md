# Hướng dẫn cấu hình Zalo Login

## Bước 1: Đăng ký ứng dụng tại Zalo Developers

1. Truy cập: https://developers.zalo.me/
2. Đăng nhập với tài khoản Zalo của bạn
3. Tạo ứng dụng mới (hoặc sử dụng ứng dụng có sẵn)
4. Lấy thông tin:
   - **App ID**: ID của ứng dụng
   - **Secret Key**: Khóa bí mật của ứng dụng
   - **Access Token**: Token để truy cập API

## Bước 2: Cấu hình biến môi trường

Thêm các dòng sau vào file `.env` của bạn:

```env
# ============================================
# ZALO CONFIGURATION
# ============================================
ZALO_APP_ID=your_zalo_app_id_here
ZALO_SECRET_KEY=your_zalo_secret_key_here
ZALO_ACCESS_TOKEN=your_zalo_access_token_here
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

1. **Frontend gọi Zalo API** để lấy phone token:
   ```javascript
   const token = await zalo.getPhoneNumber();
   ```

2. **Frontend gửi token** đến backend:
   ```javascript
   const response = await fetch('/public_api/v1/auth/zalo-login', {
     method: 'POST',
     body: JSON.stringify({ phone: token, ... })
   });
   ```

3. **Backend xử lý**:
   - Nhận phone token
   - Kiểm tra nếu token dài > 20 ký tự → Gọi Zalo API để verify
   - Lấy số điện thoại thật từ Zalo API
   - Chuẩn hóa số điện thoại (bỏ +84, 84, khoảng trắng...)
   - Tìm staff trong database theo số điện thoại
   - Nếu tìm thấy và status = ACTIVE → Tạo JWT token và đăng nhập
   - Nếu không tìm thấy → Từ chối đăng nhập

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
- **KHÔNG** chia sẻ `ZALO_SECRET_KEY` và `ZALO_ACCESS_TOKEN`
- Sử dụng HTTPS cho production
- Rotate access token định kỳ

## Liên hệ hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Zalo Developer Documentation: https://developers.zalo.me/docs
2. Laravel Log: `storage/logs/laravel.log`
3. Network tab trong browser DevTools

