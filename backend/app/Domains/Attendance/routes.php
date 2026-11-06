<?php

declare(strict_types=1);

// Routes du domaine Attendance, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Attendance\Http\Controllers\AbsenceProofFileController;
use App\Domains\Attendance\Http\Controllers\AttendanceController;
use App\Domains\Attendance\Http\Controllers\DaycareController;
use App\Domains\Attendance\Http\Controllers\PlannedAbsenceController;
use App\Domains\Attendance\Http\Controllers\SyncController;
use Illuminate\Support\Facades\Route;

// Justificatif d'absence : URL signée (relative, 10 minutes)
Route::get('files/absence-proofs/{file}', AbsenceProofFileController::class)
    ->where('file', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp')
    ->middleware('signed:relative')
    ->name('files.absence-proof');

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('attendance/classrooms', [AttendanceController::class, 'classrooms'])->name('attendance.classrooms');
    Route::get('classrooms/{classroom}/roll-calls/{date}', [AttendanceController::class, 'show'])
        ->where('date', '\d{4}-\d{2}-\d{2}')->name('roll-calls.show');
    Route::put('classrooms/{classroom}/roll-calls/{date}', [AttendanceController::class, 'save'])
        ->where('date', '\d{4}-\d{2}-\d{2}')->name('roll-calls.save');
    Route::get('classrooms/{classroom}/attendance', [AttendanceController::class, 'history'])->name('attendance.history');
    Route::get('attendance/absences', [AttendanceController::class, 'absences'])->name('attendance.absences');
    Route::post('attendance/marks/{mark}/justification', [AttendanceController::class, 'justify'])->name('attendance.justify');
    Route::post('attendance/justifications/{justification}/decision', [AttendanceController::class, 'decide'])->name('attendance.decide');
    Route::get('attendance/planned-absences', [PlannedAbsenceController::class, 'index'])->name('attendance.planned-absences');
    Route::post('attendance/planned-absences/{plannedAbsence}/decision', [PlannedAbsenceController::class, 'decide'])->name('attendance.planned-absences.decide');

    Route::get('daycare/board', [DaycareController::class, 'show'])->name('daycare.board');
    Route::post('daycare/visits', [DaycareController::class, 'check'])->name('daycare.visits.store');
    Route::post('daycare/logs', [DaycareController::class, 'log'])->name('daycare.logs.store');

    Route::post('sync', SyncController::class)->name('sync');
});
