<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grading_systems', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->string('name');                          // e.g. "ZIMSEC O-Level", "Cambridge IGCSE"
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->index('school_id');
        });

        Schema::create('grade_boundaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grading_system_id')->constrained()->cascadeOnDelete();
            $table->string('letter_grade', 5);               // A, B, C, D, E, U or 1-9
            $table->string('label', 50);                     // Distinction, Merit, Credit, Pass, Fail
            $table->decimal('min_score', 5, 2);
            $table->decimal('max_score', 5, 2);
            $table->boolean('is_pass')->default(true);
            $table->unsignedTinyInteger('points')->nullable(); // ZIMSEC points (A=1, B=2 etc.)
            $table->timestamps();

            $table->index('grading_system_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grade_boundaries');
        Schema::dropIfExists('grading_systems');
    }
};
