<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('behaviour_incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('incident_type_id')->constrained('behaviour_incident_types')->cascadeOnDelete();
            $table->foreignId('reported_by_user_id')->constrained('users');
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $table->string('term')->nullable();
            $table->string('academic_year')->nullable();
            $table->integer('points');
            $table->date('incident_date');
            $table->text('description')->nullable();
            $table->text('action_taken')->nullable();
            $table->timestamp('parent_notified_at')->nullable();
            $table->enum('status', ['recorded', 'reviewed', 'resolved', 'escalated'])->default('recorded');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('behaviour_incidents');
    }
};
