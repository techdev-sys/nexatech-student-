<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('behaviour_incident_types', function (Blueprint $table) {
            $table->index(['school_id', 'category']);
            $table->index(['school_id', 'severity']);
            $table->index(['school_id', 'is_active']);
        });

        Schema::table('behaviour_incidents', function (Blueprint $table) {
            $table->index(['school_id', 'incident_date']);
            $table->index(['school_id', 'student_id']);
            $table->index(['school_id', 'class_id']);
            $table->index(['school_id', 'incident_type_id']);
            $table->index(['school_id', 'status']);
            $table->index(['school_id', 'term', 'academic_year']);
            $table->index('deleted_at');
        });
    }

    public function down(): void
    {
        Schema::table('behaviour_incident_types', function (Blueprint $table) {
            $table->dropIndex(['school_id', 'category']);
            $table->dropIndex(['school_id', 'severity']);
            $table->dropIndex(['school_id', 'is_active']);
        });

        Schema::table('behaviour_incidents', function (Blueprint $table) {
            $table->dropIndex(['school_id', 'incident_date']);
            $table->dropIndex(['school_id', 'student_id']);
            $table->dropIndex(['school_id', 'class_id']);
            $table->dropIndex(['school_id', 'incident_type_id']);
            $table->dropIndex(['school_id', 'status']);
            $table->dropIndex(['school_id', 'term', 'academic_year']);
            $table->dropIndex(['deleted_at']);
        });
    }
};
