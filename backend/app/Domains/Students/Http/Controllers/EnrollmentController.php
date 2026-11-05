<?php

declare(strict_types=1);

namespace App\Domains\Students\Http\Controllers;

use App\Domains\Billing\Actions\CreateInvoice;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Actions\ChangeEnrollment;
use App\Domains\Students\Actions\EnrollStudent;
use App\Domains\Students\Actions\PresentStudent;
use App\Domains\Students\Http\Requests\EnrollStudentRequest;
use App\Domains\Students\Http\Requests\UpdateEnrollmentRequest;
use App\Domains\Students\Http\Resources\StudentResource;
use App\Domains\Students\Models\Student;
use App\Support\Tenancy\CurrentSchool;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use LogicException;

final class EnrollmentController
{
    public function __construct(
        private CurrentSchool $currentSchool,
        private PresentStudent $present,
    ) {}

    /**
     * Inscrire un nouvel élève.
     *
     * Dossier, tuteurs (réutilisés par téléphone : fratrie), classe et services optionnels en une fois ; matricule
     * « LAU-000123 » attribué ; facture de l'année créée d'après la grille du niveau.
     * 409 `classroom_full` (capacité atteinte) ou `year_closed` (année clôturée).
     */
    public function store(EnrollStudentRequest $request, EnrollStudent $enroll, CreateInvoice $createInvoice): JsonResponse
    {
        $school = $this->currentSchool->get() ?? throw new LogicException('Aucune école courante.');

        // Inscription et facture (grille du niveau, services choisis) dans une même transaction
        $student = DB::transaction(static function () use ($enroll, $createInvoice, $school, $request): Student {
            $student = $enroll->handle($school, $request->enrollment());
            $createInvoice->handle($student->enrollments()->firstOrFail(), $request->options());

            return $student;
        });
        $user = $request->user();

        return (new StudentResource($this->present->handle(
            $user instanceof User ? $user : throw new AuthenticationException,
            $school,
            $student,
        )))->response()->setStatusCode(201);
    }

    /**
     * Changer de classe, noter un départ ou un retour.
     *
     * `classroom_id` (même année) ou `status` : `left` (avec `left_on`, `leave_reason`) ou `active`.
     * 409 `classroom_full`, `year_closed`, `other_year`. Renvoie le dossier de l'élève.
     */
    public function update(UpdateEnrollmentRequest $request, ChangeEnrollment $change): StudentResource
    {
        $enrollment = $request->enrollment();
        $target = $request->targetClassroom();

        if ($target !== null) {
            $enrollment = $change->moveTo($enrollment, $target);
        }

        if ($request->has('status')) {
            $enrollment = $request->string('status')->toString() === 'left'
                ? $change->leave($enrollment, $request->string('left_on')->toString(), $request->filled('leave_reason') ? trim($request->string('leave_reason')->toString()) : null)
                : $change->return($enrollment);
        }

        $user = $request->user();

        return new StudentResource($this->present->handle(
            $user instanceof User ? $user : throw new AuthenticationException,
            $this->currentSchool->get() ?? throw new LogicException('Aucune école courante.'),
            Student::query()->findOrFail($enrollment->student_id),
        ));
    }
}
