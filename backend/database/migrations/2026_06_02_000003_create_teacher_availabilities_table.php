<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teacher_availabilities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('teacher_user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('day_of_week', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
            $table->foreignId('period_id')->constrained('timetable_periods')->cascadeOnDelete();
            $table->enum('availability_status', ['available', 'unavailable', 'preferred'])->default('available');
            $table->string('reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['school_id', 'teacher_user_id', 'day_of_week'], 'ta_school_teacher_day_idx');
            $table->index(['school_id', 'period_id', 'day_of_week'], 'ta_school_period_day_idx');
            $table->index(['school_id', 'deleted_at'], 'ta_school_deleted_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_availabilities');
    }
};
