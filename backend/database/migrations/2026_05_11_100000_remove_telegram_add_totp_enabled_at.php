<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('users')) {
            if (Schema::hasColumn('users', 'two_factor_telegram_chat_id')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->dropColumn('two_factor_telegram_chat_id');
                });
            }

            if (! Schema::hasColumn('users', 'two_factor_totp_enabled_at')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->timestamp('two_factor_totp_enabled_at')->nullable()->after('two_factor_totp_secret');
                });
            }
        }

        if (Schema::hasTable('users') && Schema::hasColumn('users', 'two_factor_totp_secret')
            && Schema::hasColumn('users', 'two_factor_totp_enabled_at')) {
            DB::table('users')
                ->whereNotNull('two_factor_totp_secret')
                ->where('two_factor_totp_secret', '!=', '')
                ->whereNull('two_factor_totp_enabled_at')
                ->update(['two_factor_totp_enabled_at' => now()]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('users')) {
            if (Schema::hasColumn('users', 'two_factor_totp_enabled_at')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->dropColumn('two_factor_totp_enabled_at');
                });
            }

            if (! Schema::hasColumn('users', 'two_factor_telegram_chat_id')) {
                Schema::table('users', function (Blueprint $table) {
                    $table->string('two_factor_telegram_chat_id', 32)->nullable()->after('two_factor_email_enabled');
                });
            }
        }
    }
};
