<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->boolean('is_demo')->default(false)->index();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_demo')->default(false)->index();
        });

        Schema::table('demo_requests', function (Blueprint $table) {
            $table->string('access_code_hash', 64)->nullable()->unique();
            $table->timestamp('access_code_expires_at')->nullable()->index();
            $table->timestamp('redeemed_at')->nullable();
            $table->foreignId('redeemed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
        });

        // Permanently invalidate the legacy shared plaintext demo code.
        DB::table('demo_requests')->update(['access_code' => null]);
    }

    public function down(): void
    {
        Schema::table('demo_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('redeemed_by_user_id');
            $table->dropUnique(['access_code_hash']);
            $table->dropColumn(['access_code_hash', 'access_code_expires_at', 'redeemed_at']);
        });

        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('is_demo'));
        Schema::table('schools', fn (Blueprint $table) => $table->dropColumn('is_demo'));
    }
};
