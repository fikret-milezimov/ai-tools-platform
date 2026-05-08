<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
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
                'is_active' => true,
                'two_factor_email_enabled' => false,
                'two_factor_totp_secret' => null,
                'two_factor_totp_enabled_at' => null,
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'fetata_89@abv.bg'],
            [
                'name' => 'Fikret Milezimov',
                'password' => Hash::make('password'),
                'role' => 'frontend',
                'is_active' => true,
                'two_factor_email_enabled' => false,
                'two_factor_totp_secret' => null,
                'two_factor_totp_enabled_at' => null,
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'petar@backend.local'],
            [
                'name' => 'Petar Georgiev',
                'password' => Hash::make('password'),
                'role' => 'backend',
                'is_active' => true,
                'two_factor_email_enabled' => false,
                'two_factor_totp_secret' => null,
                'two_factor_totp_enabled_at' => null,
            ]
        );
    }
}