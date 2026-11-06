<?php

declare(strict_types=1);

// Routes du domaine Grading, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Grading\Http\Controllers\GradingController;
use App\Domains\Grading\Http\Controllers\GradingSettingsController;
use App\Domains\Grading\Http\Controllers\ReportCardController;
use App\Domains\Grading\Http\Controllers\ReportCardFileController;
use Illuminate\Support\Facades\Route;

// Bulletin PDF : URL signée (relative, 10 minutes)
Route::get('files/report-cards/{file}', ReportCardFileController::class)
    ->where('file', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf')
    ->middleware('signed:relative')
    ->name('files.report-card');

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('grading/settings', [GradingSettingsController::class, 'show'])->name('grading.settings');
    Route::put('grading/cycles/{cycle}/terms', [GradingSettingsController::class, 'terms'])->name('grading.terms');
    Route::put('grading/levels/{level}/subjects', [GradingSettingsController::class, 'subjects'])->name('grading.subjects');
    Route::put('grading/cycles/{cycle}/skills', [GradingSettingsController::class, 'skills'])->name('grading.skills');
    Route::put('grading/cycles/{cycle}/mentions', [ReportCardController::class, 'mentions'])->name('grading.mentions');

    Route::get('grading/classrooms', [GradingController::class, 'classrooms'])->name('grading.classrooms');
    Route::get('classrooms/{classroom}/grade-grid', [GradingController::class, 'grid'])->name('grading.grid');
    Route::post('classrooms/{classroom}/assessments', [GradingController::class, 'store'])->name('assessments.store');
    Route::patch('assessments/{assessment}', [GradingController::class, 'update'])->name('assessments.update');
    Route::delete('assessments/{assessment}', [GradingController::class, 'destroy'])->name('assessments.destroy');
    Route::put('assessments/{assessment}/grades', [GradingController::class, 'grades'])->name('assessments.grades');
    Route::get('classrooms/{classroom}/results', [GradingController::class, 'results'])->name('grading.results');
    Route::get('classrooms/{classroom}/skills', [GradingController::class, 'skills'])->name('grading.skills.show');
    Route::put('classrooms/{classroom}/skills', [GradingController::class, 'saveSkills'])->name('grading.skills.save');

    Route::get('classrooms/{classroom}/report-cards', [ReportCardController::class, 'index'])->name('report-cards.index');
    Route::put('classrooms/{classroom}/appreciations', [ReportCardController::class, 'appreciation'])->name('report-cards.appreciation');
    Route::post('classrooms/{classroom}/report-cards/close', [ReportCardController::class, 'close'])->name('report-cards.close');
    Route::post('classrooms/{classroom}/report-cards/reopen', [ReportCardController::class, 'reopen'])->name('report-cards.reopen');
    Route::post('classrooms/{classroom}/report-cards/retry', [ReportCardController::class, 'retry'])->name('report-cards.retry');
});
