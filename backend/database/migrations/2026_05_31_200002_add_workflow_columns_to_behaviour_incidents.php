<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('behaviour_incidents', function (Blueprint $table) {
            $table->foreignId('reviewed_by_user_id')
                ->nullable()
                ->after('reported_by_user_id')
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamp('reviewed_at')->nullable()->after('parent_notified_at');
            $table->timestamp('resolved_at')->nullable()->after('reviewed_at');
            $table->timestamp('escalated_at')->nullable()->after('resolved_at');
        });
    }

    public function down(): void
    {
        Schema::table('behaviour_incidents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by_user_id');
            $table->dropColumn(['reviewed_at', 'resolved_at', 'escalated_at']);
        });
    }
};
