<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->string('title');           // e.g., 'Term 2 Tuition Fee', 'Building Levy'
            $table->string('academic_year');   // e.g., '2026'
            $table->tinyInteger('term');       // 1, 2, or 3
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('USD'); // USD, ZAR, ZiG
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_structures');
    }
};
