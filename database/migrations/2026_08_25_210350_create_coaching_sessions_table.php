<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('coaching_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('work_item_id')->unique()->constrained()->restrictOnDelete();
            $table->foreignId('primary_learning_objective_id')->constrained('competencies')->restrictOnDelete();
            $table->foreignId('client_connection_id')->constrained()->restrictOnDelete();
            $table->string('status', 30)->default('active');
            $table->timestamp('last_active_at');
            $table->timestamps();

            $table->index(['learner_id', 'status', 'last_active_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coaching_sessions');
    }
};
