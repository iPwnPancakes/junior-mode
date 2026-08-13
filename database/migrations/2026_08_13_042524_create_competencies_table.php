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
        Schema::create('competencies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('competencies')->restrictOnDelete();
            $table->unsignedInteger('position')->default(0);
            $table->string('name', 120);
            $table->text('definition');
            $table->text('demonstration_criteria');
            $table->json('prerequisites')->nullable();
            $table->json('work_opportunities')->nullable();
            $table->json('technologies')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->foreignId('merged_into_id')->nullable()->constrained('competencies')->restrictOnDelete();
            $table->timestamps();

            $table->index(['learner_id', 'parent_id', 'position']);
            $table->index(['learner_id', 'archived_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('competencies');
    }
};
