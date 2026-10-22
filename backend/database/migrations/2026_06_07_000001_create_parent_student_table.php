<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parent_student', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('school_id');
            $table->unsignedBigInteger('parent_user_id');
            $table->unsignedBigInteger('student_id');
            $table->string('relationship')->nullable();
            $table->boolean('is_primary_contact')->default(false);
            $table->boolean('can_receive_sms')->default(true);
            $table->boolean('can_receive_email')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('school_id')->references('id')->on('schools')->cascadeOnDelete();
            $table->foreign('parent_user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('students')->cascadeOnDelete();

            $table->index(['school_id', 'parent_user_id'], 'ps_school_parent');
            $table->index(['school_id', 'student_id'],     'ps_school_student');
            $table->index(['school_id', 'parent_user_id', 'student_id'], 'ps_lookup');
        });

        // Backfill existing 1-to-1 links from students.parent_user_id.
        // Only non-deleted students with a linked parent are backfilled.
        // is_primary_contact = true preserves the legacy "only parent" semantics.
        DB::statement("
            INSERT INTO parent_student
                (school_id, parent_user_id, student_id, relationship,
                 is_primary_contact, can_receive_sms, can_receive_email,
                 created_at, updated_at)
            SELECT s.school_id, s.parent_user_id, s.id, NULL,
                   TRUE, TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM students s
            WHERE s.parent_user_id IS NOT NULL
              AND s.deleted_at IS NULL
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('parent_student');
    }
};
