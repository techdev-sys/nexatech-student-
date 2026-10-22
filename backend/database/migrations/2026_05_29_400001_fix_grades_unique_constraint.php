<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            // MySQL needs the replacement index before the old index is removed
            // because the old index may be supporting a foreign key.
            DB::statement('ALTER TABLE grades
                ADD UNIQUE KEY grades_school_id_student_id_assessment_id_unique (school_id, student_id, assessment_id),
                DROP INDEX grades_school_id_student_id_subject_id_term_unique'
            );

            return;
        }

        Schema::table('grades', function (Blueprint $table) {
            $table->dropUnique('grades_school_id_student_id_subject_id_term_unique');
            $table->unique(
                ['school_id', 'student_id', 'assessment_id'],
                'grades_school_id_student_id_assessment_id_unique'
            );
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE grades
                ADD UNIQUE KEY grades_school_id_student_id_subject_id_term_unique (school_id, student_id, subject_id, term),
                DROP INDEX grades_school_id_student_id_assessment_id_unique'
            );

            return;
        }

        Schema::table('grades', function (Blueprint $table) {
            $table->dropUnique('grades_school_id_student_id_assessment_id_unique');
            $table->unique(
                ['school_id', 'student_id', 'subject_id', 'term'],
                'grades_school_id_student_id_subject_id_term_unique'
            );
        });
    }
};
