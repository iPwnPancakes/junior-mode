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
        Schema::create('coaching_priorities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('competency_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('replaced_by_priority_id')->nullable()->constrained('coaching_priorities')->nullOnDelete();
            $table->string('emphasis', 20);
            $table->string('expiration_mode', 30);
            $table->timestamp('expires_at')->nullable();
            $table->string('status', 40)->default('active');
            $table->text('note')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['learner_id', 'status', 'expires_at']);
            $table->index(['learner_id', 'competency_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coaching_priorities');
    }
};
