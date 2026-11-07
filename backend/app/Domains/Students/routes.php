<?php

declare(strict_types=1);

// Routes du domaine Students, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Students\Http\Controllers\EnrollmentController;
use App\Domains\Students\Http\Controllers\PersonPhotoFileController;
use App\Domains\Students\Http\Controllers\PreRegistrationController;
use App\Domains\Students\Http\Controllers\PublicPreRegistrationController;
use App\Domains\Students\Http\Controllers\StudentController;
use App\Domains\Students\Http\Controllers\StudentGuardianController;
use App\Domains\Students\Http\Controllers\StudentPhotoController;
use Illuminate\Support\Facades\Route;

// Photo d'un élève ou d'un tuteur : URL signée (relative, 10 minutes) renvoyée à qui peut voir l'élève
Route::get('files/person-photos/{file}', PersonPhotoFileController::class)
    ->where('file', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp')
    ->middleware('signed:relative')
    ->name('files.person-photo');

// Pré-inscription depuis la page publique : sans connexion, limitée par adresse et par téléphone
Route::post('public/schools/{slug}/pre-registrations', PublicPreRegistrationController::class)
    ->where('slug', '[a-z0-9-]{1,50}')
    ->middleware('throttle:pre-registration')
    ->name('public.schools.pre-registrations.store');

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('students', [StudentController::class, 'index'])->name('students.index');
    Route::get('students/{student}', [StudentController::class, 'show'])->name('students.show');
    Route::patch('students/{student}', [StudentController::class, 'update'])->name('students.update');
    Route::delete('students/{student}', [StudentController::class, 'destroy'])->name('students.destroy');

    Route::post('students/{student}/photo', [StudentPhotoController::class, 'storeStudent'])->name('students.photo.store');
    Route::delete('students/{student}/photo', [StudentPhotoController::class, 'destroyStudent'])->name('students.photo.destroy');
    Route::post('students/{student}/guardians/{guardian}/photo', [StudentPhotoController::class, 'storeGuardian'])->name('students.guardians.photo.store');
    Route::delete('students/{student}/guardians/{guardian}/photo', [StudentPhotoController::class, 'destroyGuardian'])->name('students.guardians.photo.destroy');

    Route::post('students/{student}/guardians', [StudentGuardianController::class, 'store'])->name('students.guardians.store');
    Route::patch('students/{student}/guardians/{guardian}', [StudentGuardianController::class, 'update'])->name('students.guardians.update');
    Route::delete('students/{student}/guardians/{guardian}', [StudentGuardianController::class, 'destroy'])->name('students.guardians.destroy');

    Route::get('pre-registrations', [PreRegistrationController::class, 'index'])->name('pre-registrations.index');
    Route::get('pre-registrations/{preRegistration}', [PreRegistrationController::class, 'show'])->name('pre-registrations.show');
    Route::post('pre-registrations/{preRegistration}/refuse', [PreRegistrationController::class, 'refuse'])->name('pre-registrations.refuse');

    Route::post('enrollments', [EnrollmentController::class, 'store'])->name('enrollments.store');
    Route::patch('enrollments/{enrollment}', [EnrollmentController::class, 'update'])->name('enrollments.update');
});
