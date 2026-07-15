<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','admin','teacher','parent') NOT NULL DEFAULT 'teacher'");
        }
        // SQLite stores TEXT; no MODIFY needed — any value is accepted.
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('super_admin','admin','teacher') NOT NULL DEFAULT 'teacher'");
        }
    }
};
