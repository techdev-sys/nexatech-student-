<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('school_id')->nullable()->index();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('action', 30);          // created | updated | deleted | restored | login | bulk_*
            $table->string('model_type', 100);     // App\Models\Student
            $table->unsignedBigInteger('model_id')->nullable();
            $table->json('old_values')->nullable(); // snapshot before change (passwords stripped)
            $table->json('new_values')->nullable(); // snapshot after change (passwords stripped)
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 300)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['school_id', 'model_type', 'model_id']);
            $table->index(['school_id', 'user_id']);
            $table->index(['model_type', 'model_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
