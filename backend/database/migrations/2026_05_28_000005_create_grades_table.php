<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('term');
            $table->decimal('score', 5, 2)->nullable();
            $table->string('grade_letter')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['school_id', 'student_id', 'subject_id', 'term']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grades');
    }
};
