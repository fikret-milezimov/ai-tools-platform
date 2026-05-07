<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'two_factor_email_enabled',
        'two_factor_telegram_chat_id',
        'two_factor_totp_secret',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_totp_secret',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_email_enabled' => 'boolean',
            'two_factor_totp_secret' => 'encrypted',
        ];
    }

    public function canUseTwoFactorMethod(string $method): bool
    {
        return match ($method) {
            'email' => (bool) $this->two_factor_email_enabled,
            'telegram' => $this->two_factor_telegram_chat_id !== null
                && $this->two_factor_telegram_chat_id !== ''
                && filled(config('services.telegram.bot_token')),
            'totp' => filled($this->two_factor_totp_secret),
            default => false,
        };
    }

    /**
     * @return list<array{id: string, label: string}>
     */
    public function availableTwoFactorMethods(): array
    {
        $out = [];
        foreach (['email', 'telegram', 'totp'] as $id) {
            if (! $this->canUseTwoFactorMethod($id)) {
                continue;
            }
            $out[] = [
                'id' => $id,
                'label' => match ($id) {
                    'email' => 'Email',
                    'telegram' => 'Telegram',
                    'totp' => 'Authenticator app',
                    default => $id,
                },
            ];
        }

        return $out;
    }

    public function requiresTwoFactor(): bool
    {
        return $this->availableTwoFactorMethods() !== [];
    }

    public function tools(): HasMany
    {
        return $this->hasMany(Tool::class, 'created_by');
    }
}
