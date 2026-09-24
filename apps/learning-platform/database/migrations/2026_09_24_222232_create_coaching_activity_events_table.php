<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coaching_activity_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('coaching_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_connection_id')->nullable()->constrained()->nullOnDelete();
            $table->string('kind', 30);
            $table->string('idempotency_key', 100);
            $table->string('request_hash', 64);
            $table->json('payload');
            $table->timestamp('created_at');
            $table->unique(['learner_id', 'idempotency_key']);
            $table->index(['coaching_session_id', 'kind']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coaching_activity_events');
    }
};
