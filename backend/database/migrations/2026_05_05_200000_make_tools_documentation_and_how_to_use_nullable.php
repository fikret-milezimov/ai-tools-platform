<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tools', function (Blueprint $table) {
            $table->string('documentation_url', 2048)->nullable()->change();
            $table->text('how_to_use')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('tools', function (Blueprint $table) {
            $table->string('documentation_url', 2048)->nullable(false)->change();
            $table->text('how_to_use')->nullable(false)->change();
        });
    }
};
