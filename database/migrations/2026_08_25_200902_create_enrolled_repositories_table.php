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
        Schema::create('enrolled_repositories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('learner_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('identity')->unique();
            $table->string('display_name', 120);
            $table->text('normalized_remote')->nullable();
            $table->string('remote_fingerprint', 64)->nullable();
            $table->text('local_path')->nullable();
            $table->timestamp('enrolled_at');
            $table->timestamp('unenrolled_at')->nullable();
            $table->timestamps();

            $table->unique(['learner_id', 'remote_fingerprint']);
            $table->index(['learner_id', 'unenrolled_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrolled_repositories');
    }
};
