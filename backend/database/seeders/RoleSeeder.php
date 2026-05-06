<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['slug' => 'owner', 'name' => 'Owner'],
            ['slug' => 'frontend', 'name' => 'Frontend'],
            ['slug' => 'backend', 'name' => 'Backend'],
            ['slug' => 'qa', 'name' => 'QA'],
            ['slug' => 'pm', 'name' => 'Product manager'],
            ['slug' => 'designer', 'name' => 'Designer'],
            ['slug' => 'user', 'name' => 'User'],
        ];

        foreach ($rows as $row) {
            Role::query()->updateOrCreate(
                ['slug' => $row['slug']],
                ['name' => $row['name']]
            );
        }
    }
}
