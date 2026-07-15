<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Single ALTER TABLE so MySQL adds the new unique (covering school_id for the FK)
        // before removing the old one — prevents "needed in a foreign key constraint" error.
        DB::statement('ALTER TABLE grades
            ADD UNIQUE KEY grades_school_id_student_id_assessment_id_unique (school_id, student_id, assessment_id),
            DROP INDEX grades_school_id_student_id_subject_id_term_unique'
        );
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE grades
            ADD UNIQUE KEY grades_school_id_student_id_subject_id_term_unique (school_id, student_id, subject_id, term),
            DROP INDEX grades_school_id_student_id_assessment_id_unique'
        );
    }
};
