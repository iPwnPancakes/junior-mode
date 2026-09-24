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
        Schema::create('competency_template_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('competency_template_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('competency_template_nodes')->cascadeOnDelete();
            $table->unsignedInteger('position')->default(0);
            $table->string('name', 120);
            $table->text('definition');
            $table->text('demonstration_criteria');
            $table->json('prerequisites')->nullable();
            $table->json('work_opportunities')->nullable();
            $table->json('technologies')->nullable();
            $table->timestamps();

            $table->index(['competency_template_id', 'parent_id', 'position']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('competency_template_nodes');
    }
};
