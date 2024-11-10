<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Faker\Factory as Faker;

class StaffSeeder extends Seeder
{
    public function run()
    {
        $faker = Faker::create('vi_VN');
        
        // Số nhân viên mỗi nhóm (3000/4 = 750)
        $staffPerGroup = 750;
        
        // Hash password một lần để dùng cho tất cả nhân viên
        $defaultPassword = Hash::make('123456');
        
        // Tạo nhân viên cho từng nhóm từ ID 1-4
        for ($groupId = 1; $groupId <= 4; $groupId++) {
            $staffs = [];
            
            for ($i = 0; $i < $staffPerGroup; $i++) {
                $staffCode = 'NV' . str_pad(($groupId * $staffPerGroup + $i + 1), 5, '0', STR_PAD_LEFT);
                
                // Tạo số điện thoại ngẫu nhiên
                $phone = '0' . $faker->numberBetween(3, 9) . $faker->numerify('########');
                
                $staffs[] = [
                    'code' => $staffCode,
                    'name' => $faker->name,
                    'phone' => $phone,
                    'username' => $phone,
                    'password' => $defaultPassword,
                    'group_id' => $groupId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                // Insert theo batch 100 records để tránh quá tải
                if (count($staffs) === 100) {
                    DB::table('staff')->insert($staffs);
                    $staffs = [];
                }
            }
            
            // Insert phần còn lại
            if (!empty($staffs)) {
                DB::table('staff')->insert($staffs);
            }
        }
    }
} 