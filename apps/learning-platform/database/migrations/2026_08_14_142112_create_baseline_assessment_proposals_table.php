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
        Schema::create('baseline_assessment_proposals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_proposal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('catalog_proposal_node_id')->constrained()->cascadeOnDelete();
            $table->string('level', 30)->default('not_yet_observed');
            $table->text('rationale')->nullable();
            $table->string('decision', 20)->default('pending');
            $table->foreignId('reviewed_by_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['catalog_proposal_id', 'catalog_proposal_node_id']);
            $table->index(['catalog_proposal_id', 'decision']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('baseline_assessment_proposals');
    }
};
