<?php

namespace Database\Seeders;

use App\Models\Staff;
use App\Models\StaffGroup;
use Illuminate\Database\Seeder;
use Faker\Factory as Faker;

class StaffSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('vi_VN'); // Tạo faker với locale tiếng Việt
        
        // Lấy danh sách các nhóm
        $groups = StaffGroup::all();

        foreach ($groups as $index => $group) {
            // Tạo 2-3 nhân viên cho mỗi ca
            for ($i = 1; $i <= 3; $i++) {
                $code = 'DRV' . str_pad(($index * 3 + $i), 3, '0', STR_PAD_LEFT);
                $name = $faker->name(); // Tạo tên người Việt Nam ngẫu nhiên
                
                Staff::create([
                    'type' => 'DRIVER',
                    'group_id' => $group->id,
                    'code' => $code,
                    'name' => $name,
                    'username' => strtolower(str_replace(' ', '', "tx{$group->name}{$i}")),
                    'password' => md5('123456'),
                    'birtdate' => $faker->dateTimeBetween('-50 years', '-20 years'),
                    'address' => $faker->address(),
                    'card_id' => $faker->numerify('##########'),
                    'status' => 'ACTIVE',
                    'vehical_size' => 6
                ]);
            }
        }
    }
} 