<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('behaviour_incident_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('default_points')->default(0);
            $table->enum('severity', ['low', 'medium', 'high', 'critical'])->default('low');
            $table->enum('category', ['positive', 'negative', 'neutral'])->default('negative');
            $table->boolean('notify_parent')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('behaviour_incident_types');
    }
};
