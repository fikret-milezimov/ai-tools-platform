<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name' => 'Ivan Ivanov',
            'email' => 'ivan@admin.local',
            'password' => Hash::make('password'),
            'role' => 'owner'
        ]);

        User::create([
            'name' => 'Elena Petrova',
            'email' => 'elena@frontend.local',
            'password' => Hash::make('password'),
            'role' => 'frontend'
        ]);

        User::create([
            'name' => 'Petar Georgiev',
            'email' => 'petar@backend.local',
            'password' => Hash::make('password'),
            'role' => 'backend'
        ]);
    }
}