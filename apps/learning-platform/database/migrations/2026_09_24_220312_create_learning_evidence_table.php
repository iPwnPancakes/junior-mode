<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learning_evidence', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('coaching_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('competency_id')->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('client_connection_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('supersedes_id')->nullable()->unique()->constrained('learning_evidence')->restrictOnDelete();
            $table->string('idempotency_key', 100);
            $table->string('request_hash', 64);
            $table->unsignedSmallInteger('schema_version')->default(1);
            $table->json('evidence');
            $table->timestamp('created_at');
            $table->unique(['learner_id', 'idempotency_key']);
            $table->index(['learner_id', 'competency_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learning_evidence');
    }
};
