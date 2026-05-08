<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->update([
            'two_factor_email_enabled' => false,
            'two_factor_totp_secret' => null,
            'two_factor_totp_enabled_at' => null,
        ]);
    }

    public function down(): void
    {
        // Intentionally left empty. Previous per-user 2FA state cannot be restored safely.
    }
};
