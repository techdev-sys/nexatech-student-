<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->enum('type', ['test', 'assignment', 'coursework', 'exam'])
                ->default('test')
                ->after('name');
            $table->foreignId('exam_session_id')
                ->nullable()
                ->after('grading_system_id')
                ->constrained('exam_sessions')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropForeign(['exam_session_id']);
            $table->dropColumn(['type', 'exam_session_id']);
        });
    }
};
