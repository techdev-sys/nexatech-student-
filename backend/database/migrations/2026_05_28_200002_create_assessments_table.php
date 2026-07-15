<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('grading_system_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');                          // "Test 1", "Mid-term", "End of Term"
            $table->string('academic_year', 9);              // "2026"
            $table->unsignedTinyInteger('term');             // 1, 2, 3
            $table->decimal('weightage', 5, 2);              // % contribution to final grade (must sum to 100)
            $table->decimal('max_marks', 8, 2)->default(100);
            $table->timestamps();

            $table->index(['school_id', 'subject_id', 'term', 'academic_year']);
        });

        Schema::table('grades', function (Blueprint $table) {
            $table->foreignId('assessment_id')->nullable()->after('subject_id')->constrained()->nullOnDelete();
            $table->decimal('weighted_score', 8, 2)->nullable()->after('score');
            $table->string('academic_year', 9)->nullable()->after('term');
        });
    }

    public function down(): void
    {
        Schema::table('grades', function (Blueprint $table) {
            $table->dropForeign(['assessment_id']);
            $table->dropColumn(['assessment_id', 'weighted_score', 'academic_year']);
        });
        Schema::dropIfExists('assessments');
    }
};
