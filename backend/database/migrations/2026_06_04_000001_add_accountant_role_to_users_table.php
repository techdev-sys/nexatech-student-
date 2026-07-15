<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Accounting module (Phase 4A) introduces a dedicated finance role.
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','admin','teacher','parent','platform_admin','accountant') NOT NULL DEFAULT 'teacher'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','admin','teacher','parent','platform_admin') NOT NULL DEFAULT 'teacher'");
        }
    }
};
