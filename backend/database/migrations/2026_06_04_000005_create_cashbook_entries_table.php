<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Append-only cash ledger. Intentionally NO soft deletes — entries are
        // permanent financial records derived from payments / paid expenses.
        Schema::create('cashbook_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->enum('entry_type', ['income', 'expense']);
            $table->string('reference_type')->nullable(); // e.g. 'transaction', 'expense'
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->date('transaction_date');
            $table->decimal('amount', 12, 2);
            $table->text('description')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['school_id', 'entry_type']);
            $table->index(['school_id', 'transaction_date']);
            $table->index(['school_id', 'reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cashbook_entries');
    }
};
