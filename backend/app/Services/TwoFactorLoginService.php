<?php

namespace App\Services;

use App\Mail\LoginOtpMail;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorLoginService
{
    private const TTL_SECONDS = 600;

    private const MAX_ATTEMPTS = 5;

    private const METHODS = ['email', 'totp'];

    /**
     * @return array{pending_token: string, methods: list<array{id: string, label: string}>}
     */
    public function createPendingLogin(User $user): array
    {
        $methods = $user->availableTwoFactorMethods();
        if ($methods === []) {
            throw new \InvalidArgumentException('User has no 2FA methods configured.');
        }

        $pendingToken = bin2hex(random_bytes(32));
        $payload = [
            'user_id' => $user->id,
            'expires_at' => time() + self::TTL_SECONDS,
            'method' => null,
            'code_hash' => null,
            'attempts' => 0,
        ];

        Cache::put($this->cacheKey($pendingToken), $payload, self::TTL_SECONDS + 120);

        return [
            'pending_token' => $pendingToken,
            'methods' => $methods,
        ];
    }

    /**
     * Start the chosen method: send OTP for email, or mark totp for app-based verification.
     *
     * @throws \InvalidArgumentException
     */
    public function startMethod(string $pendingToken, string $method): void
    {
        if (! in_array($method, self::METHODS, true)) {
            throw new \InvalidArgumentException('Invalid 2FA method.');
        }

        $key = $this->cacheKey($pendingToken);
        $payload = Cache::get($key);
        if (! is_array($payload)) {
            throw new \InvalidArgumentException('Session expired.');
        }

        if (time() > (int) ($payload['expires_at'] ?? 0)) {
            Cache::forget($key);
            throw new \InvalidArgumentException('Session expired.');
        }

        $user = User::query()->find($payload['user_id'] ?? null);
        if (! $user || ! $user->canUseTwoFactorMethod($method)) {
            throw new \InvalidArgumentException('This verification method is not available for your account.');
        }

        if ($method === 'totp') {
            $payload['method'] = 'totp';
            $payload['code_hash'] = null;
            $payload['expires_at'] = time() + self::TTL_SECONDS;
            $payload['attempts'] = 0;
            Cache::put($key, $payload, self::TTL_SECONDS + 120);

            return;
        }

        $plainCode = $this->generateOtp();
        $payload['method'] = $method;
        $payload['code_hash'] = hash('sha256', $plainCode);
        $payload['attempts'] = 0;
        $payload['expires_at'] = time() + self::TTL_SECONDS;
        Cache::put($key, $payload, self::TTL_SECONDS + 120);

        try {
            Mail::to($user->email)->send(new LoginOtpMail($plainCode, $user->name));
        } catch (\Throwable $e) {
            report($e);
            throw new \RuntimeException(
                'Could not send the login email. Configure MAIL_MAILER, MAIL_HOST, and related settings in .env for production.'
            );
        }
    }

    public function verify(string $pendingToken, string $method, string $code): ?User
    {
        if (! in_array($method, self::METHODS, true)) {
            return null;
        }

        $key = $this->cacheKey($pendingToken);
        $payload = Cache::get($key);

        if (! is_array($payload)) {
            return null;
        }

        if (time() > (int) ($payload['expires_at'] ?? 0)) {
            Cache::forget($key);

            return null;
        }

        $activeMethod = $payload['method'] ?? null;
        if ($activeMethod === null || $activeMethod !== $method) {
            return null;
        }

        $attempts = (int) ($payload['attempts'] ?? 0);
        if ($attempts >= self::MAX_ATTEMPTS) {
            Cache::forget($key);

            return null;
        }

        $user = User::query()->find($payload['user_id'] ?? null);
        if (! $user) {
            Cache::forget($key);

            return null;
        }

        if ($method === 'totp') {
            $secret = $user->two_factor_totp_secret;
            if ($secret === null || $secret === '') {
                Cache::forget($key);

                return null;
            }

            $google2fa = new Google2FA;
            $valid = $google2fa->verifyKey($secret, $code, 2);
            if (! $valid) {
                $payload['attempts'] = $attempts + 1;
                Cache::put($key, $payload, self::TTL_SECONDS + 120);

                return null;
            }

            Cache::forget($key);

            return $user;
        }

        $expectedHash = $payload['code_hash'] ?? '';
        $actualHash = hash('sha256', $code);

        if (! hash_equals($expectedHash, $actualHash)) {
            $payload['attempts'] = $attempts + 1;
            Cache::put($key, $payload, self::TTL_SECONDS + 120);

            return null;
        }

        Cache::forget($key);

        return $user;
    }

    /**
     * Resend OTP for email only.
     */
    public function resend(string $pendingToken): bool
    {
        $key = $this->cacheKey($pendingToken);
        $payload = Cache::get($key);

        if (! is_array($payload)) {
            return false;
        }

        if (time() > (int) ($payload['expires_at'] ?? 0)) {
            Cache::forget($key);

            return false;
        }

        $method = $payload['method'] ?? null;
        if ($method !== 'email') {
            return false;
        }

        $user = User::query()->find($payload['user_id'] ?? null);
        if (! $user) {
            Cache::forget($key);

            return false;
        }

        $plainCode = $this->generateOtp();
        $payload['code_hash'] = hash('sha256', $plainCode);
        $payload['attempts'] = 0;
        $payload['expires_at'] = time() + self::TTL_SECONDS;

        Cache::put($key, $payload, self::TTL_SECONDS + 120);

        try {
            Mail::to($user->email)->send(new LoginOtpMail($plainCode, $user->name));
        } catch (\Throwable $e) {
            report($e);
            throw new \RuntimeException(
                'Could not send the login email. Configure MAIL_MAILER, MAIL_HOST, and related settings in .env for production.'
            );
        }

        return true;
    }

    private function generateOtp(): string
    {
        return str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);
    }

    private function cacheKey(string $pendingToken): string
    {
        return '2fa_login:'.hash('sha256', $pendingToken);
    }
}
