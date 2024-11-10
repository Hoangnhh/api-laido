<?php

namespace Database\Seeders;

use App\Models\StaffGroup;
use Illuminate\Database\Seeder;

class StaffGroupSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            [
                'name' => 'Ca 1',
                'status' => 'ACTIVE'
            ],
            [
                'name' => 'Ca 2',
                'status' => 'ACTIVE'
            ],
            [
                'name' => 'Ca 3',
                'status' => 'ACTIVE'
            ],
            [
                'name' => 'Ca 4',
                'status' => 'ACTIVE'
            ]
        ];

        foreach ($groups as $group) {
            StaffGroup::create($group);
        }
    }
} 