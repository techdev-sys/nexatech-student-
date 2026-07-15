<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Promote application-level cashbook idempotency to a database guarantee.
     *
     * (school_id, reference_type, reference_id) is unique. Real income entries
     * are ('transaction', txn_id) and expense entries are ('expense', exp_id),
     * each globally unique by source. Rows with NULL references (manual/legacy
     * adjustments) are exempt — InnoDB treats NULLs as distinct in a UNIQUE
     * index — so the append-only ledger remains free to hold un-referenced rows.
     */
    public function up(): void
    {
        Schema::table('cashbook_entries', function (Blueprint $table) {
            // Replace the plain lookup index with a UNIQUE one over the same columns.
            $table->dropIndex(['school_id', 'reference_type', 'reference_id']);
            $table->unique(['school_id', 'reference_type', 'reference_id'], 'cb_unique_reference');
        });
    }

    public function down(): void
    {
        Schema::table('cashbook_entries', function (Blueprint $table) {
            $table->dropUnique('cb_unique_reference');
            $table->index(['school_id', 'reference_type', 'reference_id']);
        });
    }
};
