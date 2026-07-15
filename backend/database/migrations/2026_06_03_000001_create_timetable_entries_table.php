<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timetable_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained('subjects')->cascadeOnDelete();
            $table->foreignId('teacher_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained('timetable_rooms')->nullOnDelete();
            $table->foreignId('period_id')->constrained('timetable_periods')->cascadeOnDelete();
            $table->enum('day_of_week', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
            $table->string('academic_year', 9);
            $table->string('term', 50);
            $table->enum('status', ['draft', 'active', 'cancelled'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Explicit short index names — 4-column composites exceed MySQL's 64-char auto-name limit.
            $table->index(['school_id', 'class_id', 'day_of_week', 'period_id'],       'te_class_slot_idx');
            $table->index(['school_id', 'teacher_user_id', 'day_of_week', 'period_id'],'te_teacher_slot_idx');
            $table->index(['school_id', 'room_id', 'day_of_week', 'period_id'],        'te_room_slot_idx');
            $table->index(['school_id', 'academic_year', 'term'],                      'te_year_term_idx');
            $table->index(['school_id', 'status'],                                     'te_status_idx');
            $table->index(['school_id', 'deleted_at'],                                 'te_deleted_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timetable_entries');
    }
};
