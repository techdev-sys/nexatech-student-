<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Extend status enum to include queued and cancelled
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE communications MODIFY COLUMN status ENUM('draft','scheduled','queued','processing','completed','failed','cancelled') NOT NULL DEFAULT 'draft'");
            DB::statement("ALTER TABLE communication_deliveries MODIFY COLUMN delivery_status ENUM('pending','queued','sent','delivered','failed','skipped') NOT NULL DEFAULT 'pending'");
        }

        // Add sent_at and failed_at columns to delivery rows
        Schema::table('communication_deliveries', function (Blueprint $table) {
            $table->timestamp('sent_at')->nullable()->after('delivered_at');
            $table->timestamp('failed_at')->nullable()->after('sent_at');
        });

        // ── Indexes ──────────────────────────────────────────────────────────

        Schema::table('communication_templates', function (Blueprint $table) {
            $table->index(['school_id', 'channel']);
            $table->index(['school_id', 'is_active']);
            $table->index('deleted_at');
        });

        Schema::table('communications', function (Blueprint $table) {
            $table->index(['school_id', 'channel']);
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'scheduled_at']);
            $table->index(['school_id', 'created_by_user_id']);
            $table->index(['school_id', 'created_at']);
            $table->index('deleted_at');
        });

        Schema::table('communication_deliveries', function (Blueprint $table) {
            $table->index(['school_id', 'communication_id']);
            $table->index(['school_id', 'delivery_status']);
            $table->index(['school_id', 'channel']);
            $table->index(['school_id', 'recipient_user_id']);
            $table->index(['school_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('communication_deliveries', function (Blueprint $table) {
            $table->dropColumn(['sent_at', 'failed_at']);
            $table->dropIndex(['school_id', 'communication_id']);
            $table->dropIndex(['school_id', 'delivery_status']);
            $table->dropIndex(['school_id', 'channel']);
            $table->dropIndex(['school_id', 'recipient_user_id']);
            $table->dropIndex(['school_id', 'created_at']);
        });

        Schema::table('communications', function (Blueprint $table) {
            $table->dropIndex(['school_id', 'channel']);
            $table->dropIndex(['school_id', 'status']);
            $table->dropIndex(['school_id', 'scheduled_at']);
            $table->dropIndex(['school_id', 'created_by_user_id']);
            $table->dropIndex(['school_id', 'created_at']);
            $table->dropIndex(['deleted_at']);
        });

        Schema::table('communication_templates', function (Blueprint $table) {
            $table->dropIndex(['school_id', 'channel']);
            $table->dropIndex(['school_id', 'is_active']);
            $table->dropIndex(['deleted_at']);
        });

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE communications MODIFY COLUMN status ENUM('draft','scheduled','processing','completed','failed') NOT NULL DEFAULT 'draft'");
            DB::statement("ALTER TABLE communication_deliveries MODIFY COLUMN delivery_status ENUM('pending','sent','delivered','failed') NOT NULL DEFAULT 'pending'");
        }
    }
};
