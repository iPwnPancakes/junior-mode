<?php

namespace App\Http\Controllers\Settings;

use App\Actions\ExportLearningRecord;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LearningRecordExportController extends Controller
{
    public function __invoke(Request $request, ExportLearningRecord $export): StreamedResponse
    {
        /** @var User $learner */
        $learner = $request->user();
        $record = $export->handle($learner);

        return response()->streamDownload(function () use ($record): void {
            echo json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        }, 'junior-mode-learning-record-'.now()->format('Y-m-d').'.json', [
            'Content-Type' => 'application/json; charset=UTF-8',
            'Cache-Control' => 'private, no-store, max-age=0',
            'Pragma' => 'no-cache',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
