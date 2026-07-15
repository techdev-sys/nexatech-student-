<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('communications', function (Blueprint $table) {
            $table->timestamp('published_at')->nullable()->after('scheduled_at');
            $table->timestamp('expires_at')->nullable()->after('published_at');

            $table->index(['school_id', 'published_at']);
            $table->index(['school_id', 'expires_at']);
        });
    }

    public function down(): void
    {
        Schema::table('communications', function (Blueprint $table) {
            $table->dropIndex(['school_id', 'published_at']);
            $table->dropIndex(['school_id', 'expires_at']);
            $table->dropColumn(['published_at', 'expires_at']);
        });
    }
};
