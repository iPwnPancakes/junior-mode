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
        Schema::create('catalog_proposal_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('catalog_proposal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('catalog_proposal_nodes')->cascadeOnDelete();
            $table->unsignedInteger('position')->default(0);
            $table->string('name', 120);
            $table->text('definition');
            $table->text('demonstration_criteria');
            $table->json('prerequisites')->nullable();
            $table->json('work_opportunities')->nullable();
            $table->json('technologies')->nullable();
            $table->boolean('selected')->default(true);
            $table->foreignId('copied_competency_id')->nullable()->constrained('competencies')->restrictOnDelete();
            $table->timestamps();

            $table->index(['catalog_proposal_id', 'parent_id', 'position']);
            $table->index(['catalog_proposal_id', 'selected']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_proposal_nodes');
    }
};
