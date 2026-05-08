<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $google2fa = new Google2FA;
        $demoTotpSecret = env('TWO_FACTOR_DEMO_TOTP_SECRET');
        if (! is_string($demoTotpSecret) || $demoTotpSecret === '') {
            $demoTotpSecret = $google2fa->generateSecretKey();
            if (isset($this->command)) {
                $this->command->warn(
                    'Add TWO_FACTOR_DEMO_TOTP_SECRET to .env for a stable authenticator secret. This run: '.$demoTotpSecret
                );
            }
        }

        User::query()->updateOrCreate(
            ['email' => 'fetata89@gmail.com'],
            [
                'name' => 'Ivan Ivanov',
                'password' => Hash::make('password'),
                'role' => 'owner',
                'two_factor_email_enabled' => true,
                'two_factor_totp_secret' => $demoTotpSecret,
                'two_factor_totp_enabled_at' => now(),
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'fetata_89@abv.bg'],
            [
                'name' => 'Fikret Milezimov',
                'password' => Hash::make('password'),
                'role' => 'frontend',
                'two_factor_email_enabled' => true,
            ]
        );

        User::query()->updateOrCreate(
            ['email' => 'petar@backend.local'],
            [
                'name' => 'Petar Georgiev',
                'password' => Hash::make('password'),
                'role' => 'backend',
                'two_factor_email_enabled' => true,
            ]
        );
    }
}