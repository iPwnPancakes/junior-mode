<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coaching_sessions', function (Blueprint $table) {
            $table->string('idempotency_key', 100)->nullable();
            $table->string('request_hash', 64)->nullable();
            $table->text('desired_outcome')->nullable();
            $table->json('acceptance_criteria')->nullable();
            $table->json('responsibility_split')->nullable();
            $table->json('completion')->nullable();
            $table->string('completion_key', 100)->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unique(['learner_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::table('coaching_sessions', function (Blueprint $table) {
            $table->dropUnique(['learner_id', 'idempotency_key']);
            $table->dropColumn(['idempotency_key', 'request_hash', 'desired_outcome', 'acceptance_criteria', 'responsibility_split', 'completion', 'completion_key', 'completed_at']);
        });
    }
};
