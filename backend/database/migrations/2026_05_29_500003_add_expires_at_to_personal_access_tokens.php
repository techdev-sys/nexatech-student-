<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Sanctum's personal_access_tokens table already has expires_at in recent versions.
// This migration is a no-op guard: only adds the column if it doesn't already exist.
return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('personal_access_tokens', 'expires_at')) {
            Schema::table('personal_access_tokens', function (Blueprint $table) {
                $table->timestamp('expires_at')->nullable()->after('last_used_at');
            });
        }
    }

    public function down(): void {} // intentionally non-destructive
};
