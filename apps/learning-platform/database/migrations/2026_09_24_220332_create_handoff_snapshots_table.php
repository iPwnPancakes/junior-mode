<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('handoff_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('coaching_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mentor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('payload');
            $table->string('fingerprint', 64);
            $table->string('idempotency_key', 100);
            $table->string('request_hash', 64);
            $table->timestamp('shared_at')->nullable();
            $table->timestamps();
            $table->unique(['learner_id', 'idempotency_key'], 'handoff_snapshot_identity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('handoff_snapshots');
    }
};
