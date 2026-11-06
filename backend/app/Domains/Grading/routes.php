<?php

declare(strict_types=1);

// Routes du domaine Grading, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Grading\Http\Controllers\GradingController;
use App\Domains\Grading\Http\Controllers\GradingSettingsController;
use Illuminate\Support\Facades\Route;

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('grading/settings', [GradingSettingsController::class, 'show'])->name('grading.settings');
    Route::put('grading/cycles/{cycle}/terms', [GradingSettingsController::class, 'terms'])->name('grading.terms');
    Route::put('grading/levels/{level}/subjects', [GradingSettingsController::class, 'subjects'])->name('grading.subjects');
    Route::put('grading/cycles/{cycle}/skills', [GradingSettingsController::class, 'skills'])->name('grading.skills');

    Route::get('grading/classrooms', [GradingController::class, 'classrooms'])->name('grading.classrooms');
    Route::get('classrooms/{classroom}/grade-grid', [GradingController::class, 'grid'])->name('grading.grid');
    Route::post('classrooms/{classroom}/assessments', [GradingController::class, 'store'])->name('assessments.store');
    Route::patch('assessments/{assessment}', [GradingController::class, 'update'])->name('assessments.update');
    Route::delete('assessments/{assessment}', [GradingController::class, 'destroy'])->name('assessments.destroy');
    Route::put('assessments/{assessment}/grades', [GradingController::class, 'grades'])->name('assessments.grades');
    Route::get('classrooms/{classroom}/results', [GradingController::class, 'results'])->name('grading.results');
    Route::get('classrooms/{classroom}/skills', [GradingController::class, 'skills'])->name('grading.skills.show');
    Route::put('classrooms/{classroom}/skills', [GradingController::class, 'saveSkills'])->name('grading.skills.save');
});
