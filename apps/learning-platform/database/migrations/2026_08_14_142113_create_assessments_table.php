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
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('competency_id')->constrained()->restrictOnDelete();
            $table->foreignId('assessed_by_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('baseline_assessment_proposal_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $table->string('level', 30);
            $table->text('rationale')->nullable();
            $table->timestamp('assessed_at');
            $table->timestamps();

            $table->index(['learner_id', 'competency_id', 'assessed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessments');
    }
};
