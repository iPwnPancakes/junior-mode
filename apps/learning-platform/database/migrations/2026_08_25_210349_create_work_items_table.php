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
        Schema::create('work_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('enrolled_repository_id')->constrained()->restrictOnDelete();
            $table->string('fingerprint', 64);
            $table->string('title', 200);
            $table->text('description');
            $table->text('external_url')->nullable();
            $table->json('detected_technologies');
            $table->json('likely_catalog_branches');
            $table->timestamps();

            $table->index(['learner_id', 'enrolled_repository_id', 'fingerprint']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_items');
    }
};
