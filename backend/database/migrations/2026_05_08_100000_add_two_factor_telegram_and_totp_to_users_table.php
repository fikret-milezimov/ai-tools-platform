<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('two_factor_telegram_chat_id', 32)->nullable()->after('two_factor_email_enabled');
            $table->text('two_factor_totp_secret')->nullable()->after('two_factor_telegram_chat_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['two_factor_telegram_chat_id', 'two_factor_totp_secret']);
        });
    }
};
