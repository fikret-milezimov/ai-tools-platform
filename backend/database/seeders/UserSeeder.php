<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'fetata89@gmail.com'],
            [
                'name' => 'Ivan Ivanov',
                'password' => Hash::make('password'),
                'role' => 'owner',
                'two_factor_email_enabled' => true,
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'elena@frontend.local'],
            [
                'name' => 'Elena Petrova',
                'password' => Hash::make('password'),
                'role' => 'frontend',
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'petar@backend.local'],
            [
                'name' => 'Petar Georgiev',
                'password' => Hash::make('password'),
                'role' => 'backend',
            ]
        );
    }
}