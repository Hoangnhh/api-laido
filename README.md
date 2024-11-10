# Admin Dashboard Project

Dự án dashboard admin sử dụng Laravel và React.

## Yêu cầu hệ thống

- PHP >= 8.1
- Node.js >= 16.0
- Composer
- MySQL/MariaDB

## Cài đặt và Chạy Local

### 1. Clone dự án

composer install

npm install

Tạo file .env
cp .env.example .env

Generate application key
php artisan key:generate

# Cấu hình database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Chạy migrations
php artisan migrate
Chạy seeder (nếu có)
php artisan db:seed

# Chạy server Laravel
php artisan serve

# Chạy server React
npm run dev

# Cấu trúc dự án
├── app/
│ ├── Http/
│ │ ├── Controllers/
│ │ │ └── Admin/
│ │ └── Middleware/
├── resources/
│ ├── js/
│ │ ├── components/
│ │ │ ├── admin/
│ │ │ └── auth/
│ │ └── app.jsx
│ └── views/
│ └── admin/
└── routes/
└── web.php

# Clear cache
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear

# Clear node_modules
rm -rf node_modules

# Install node_modules
npm install

# Tail Laravel log
tail -f storage/logs/laravel.log
tail -f storage/logs/laravel.log