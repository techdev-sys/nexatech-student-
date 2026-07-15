<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('transaction_reference')->unique(); // Internal tracking ref
            $table->string('gateway_reference')->nullable();  // External ref from Paynow/Stitch
            $table->enum('gateway', ['paynow', 'stitch', 'payfast', 'manual']);
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3);
            $table->enum('status', ['pending', 'successful', 'failed'])->default('pending');
            $table->string('payer_phone_or_email')->nullable();
            $table->json('gateway_raw_response')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
