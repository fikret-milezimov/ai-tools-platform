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
     * @var array<string, mixed>
     */
    protected $attributes = [
        'two_factor_email_enabled' => true,
    ];

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
        'two_factor_totp_secret',
        'two_factor_totp_enabled_at',
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
            'two_factor_totp_enabled_at' => 'datetime',
        ];
    }

    public function canUseTwoFactorMethod(string $method): bool
    {
        return match ($method) {
            'email' => (bool) $this->two_factor_email_enabled,
            'totp' => filled($this->two_factor_totp_secret)
                && $this->two_factor_totp_enabled_at !== null,
            default => false,
        };
    }

    /**
     * @return list<array{id: string, label: string}>
     */
    public function availableTwoFactorMethods(): array
    {
        $out = [];
        foreach (['email', 'totp'] as $id) {
            if (! $this->canUseTwoFactorMethod($id)) {
                continue;
            }
            $out[] = [
                'id' => $id,
                'label' => match ($id) {
                    'email' => 'Email',
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

    public function hasAnotherTwoFactorMethodBesides(string $method): bool
    {
        $active = array_column($this->availableTwoFactorMethods(), 'id');

        return count(array_diff($active, [$method])) > 0;
    }

    public function tools(): HasMany
    {
        return $this->hasMany(Tool::class, 'created_by');
    }
}
