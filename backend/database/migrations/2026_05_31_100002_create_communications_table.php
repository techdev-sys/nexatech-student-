<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('communications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->foreignId('template_id')->nullable()->constrained('communication_templates')->nullOnDelete();
            $table->enum('channel', ['sms', 'email', 'announcement']);
            $table->string('audience_type'); // all, parents, teachers, staff, class, grade, custom
            $table->json('audience_filter_json')->nullable();
            $table->string('subject')->nullable();
            $table->text('body');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->enum('status', ['draft', 'scheduled', 'queued', 'processing', 'completed', 'failed', 'cancelled'])->default('draft');
            $table->unsignedInteger('total_recipients')->default(0);
            $table->unsignedInteger('successful_deliveries')->default(0);
            $table->unsignedInteger('failed_deliveries')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('communications');
    }
};
