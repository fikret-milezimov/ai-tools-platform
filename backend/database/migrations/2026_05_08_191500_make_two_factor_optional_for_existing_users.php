<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $update = [];
        if (Schema::hasColumn('users', 'two_factor_email_enabled')) {
            $update['two_factor_email_enabled'] = false;
        }
        if (Schema::hasColumn('users', 'two_factor_totp_secret')) {
            $update['two_factor_totp_secret'] = null;
        }
        if (Schema::hasColumn('users', 'two_factor_totp_enabled_at')) {
            $update['two_factor_totp_enabled_at'] = null;
        }

        if ($update !== []) {
            DB::table('users')->update($update);
        }
    }

    public function down(): void
    {
        // Intentionally left empty. Previous per-user 2FA state cannot be restored safely.
    }
};
