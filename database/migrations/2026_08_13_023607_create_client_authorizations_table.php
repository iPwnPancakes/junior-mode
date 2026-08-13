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
        Schema::create('client_authorizations', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('device_code_hash', 64)->unique();
            $table->string('user_code_hash', 64)->unique();
            $table->timestamp('expires_at')->index();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('exchanged_at')->nullable();
            $table->foreignId('client_connection_id')
                ->nullable()
                ->unique()
                ->constrained()
                ->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_authorizations');
    }
};
