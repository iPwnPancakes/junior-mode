<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('handoff_snapshots', 'help_requests');

        Schema::table('help_requests', function (Blueprint $table) {
            $table->renameIndex('handoff_snapshot_identity', 'help_request_identity');
        });
    }

    public function down(): void
    {
        Schema::table('help_requests', function (Blueprint $table) {
            $table->renameIndex('help_request_identity', 'handoff_snapshot_identity');
        });

        Schema::rename('help_requests', 'handoff_snapshots');
    }
};
