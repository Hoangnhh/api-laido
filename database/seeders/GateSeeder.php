<?php

namespace Database\Seeders;

use App\Models\Gate;
use Illuminate\Database\Seeder;

class GateSeeder extends Seeder
{
    public function run(): void
    {
        $gates = [
            ['name' => 'Cổng 1', 'status' => 'ACTIVE'],
            ['name' => 'Cổng 2', 'status' => 'ACTIVE'],
            ['name' => 'Cổng 3', 'status' => 'ACTIVE'],
            ['name' => 'Cổng 4', 'status' => 'ACTIVE'],
            ['name' => 'Cổng 5', 'status' => 'ACTIVE'],
            ['name' => 'Cổng 6', 'status' => 'ACTIVE'],
            ['name' => 'Cổng 7', 'status' => 'ACTIVE'],
            ['name' => 'Cổng 8', 'status' => 'ACTIVE'],
            ['name' => 'Cổng 9', 'status' => 'ACTIVE'],
            ['name' => 'Cổng 10', 'status' => 'ACTIVE'],
        ];

        foreach ($gates as $gate) {
            Gate::create($gate);
        }
    }
} 