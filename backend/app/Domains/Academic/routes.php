<?php

declare(strict_types=1);

// Routes du domaine Academic, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Academic\Http\Controllers\AcademicYearController;
use App\Domains\Academic\Http\Controllers\ClassroomController;
use App\Domains\Academic\Http\Controllers\CycleController;
use App\Domains\Academic\Http\Controllers\SchoolEventController;
use Illuminate\Support\Facades\Route;

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('cycles', [CycleController::class, 'index'])->name('cycles.index');
    Route::patch('cycles/{cycle}', [CycleController::class, 'update'])->name('cycles.update');

    Route::get('academic-years', [AcademicYearController::class, 'index'])->name('academic-years.index');
    Route::post('academic-years', [AcademicYearController::class, 'store'])->name('academic-years.store');
    Route::patch('academic-years/{academicYear}', [AcademicYearController::class, 'update'])->name('academic-years.update');

    Route::get('classrooms', [ClassroomController::class, 'index'])->name('classrooms.index');
    Route::post('classrooms', [ClassroomController::class, 'store'])->name('classrooms.store');
    Route::patch('classrooms/{classroom}', [ClassroomController::class, 'update'])->name('classrooms.update');
    Route::delete('classrooms/{classroom}', [ClassroomController::class, 'destroy'])->name('classrooms.destroy');

    Route::get('calendar/events', [SchoolEventController::class, 'index'])->name('calendar.events.index');
    Route::post('calendar/events', [SchoolEventController::class, 'store'])->name('calendar.events.store');
    Route::patch('calendar/events/{event}', [SchoolEventController::class, 'update'])->name('calendar.events.update');
    Route::delete('calendar/events/{event}', [SchoolEventController::class, 'destroy'])->name('calendar.events.destroy');
});
