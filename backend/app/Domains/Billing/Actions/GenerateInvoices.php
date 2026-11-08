<?php

declare(strict_types=1);

namespace App\Domains\Billing\Actions;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Billing\Models\Invoice;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Models\Enrollment;
use Illuminate\Database\Eloquent\Builder;

/**
 * Factures des élèves déjà inscrits (mise en place de la facturation, ou grille saisie après les inscriptions) :
 * inscriptions actives de l'année, dans les cycles donnés, qui n'ont pas encore de facture. Sans service optionnel ;
 * un niveau dont la grille est vide ne crée pas de facture.
 */
final readonly class GenerateInvoices
{
    public function __construct(private CreateInvoice $create) {}

    /**
     * @param  list<string>|null  $cycleIds  null = tous les cycles
     * @return int nombre de factures créées
     */
    public function handle(AcademicYear $year, ?array $cycleIds): int
    {
        $created = 0;

        foreach (self::pending($year, $cycleIds)->with(['classroom.level.cycle', 'academicYear'])->get() as $enrollment) {
            // Niveau sans frais dans la grille : pas de facture, l'élève reste à facturer
            if ($this->create->handle($enrollment) !== null) {
                $created++;
            }
        }

        return $created;
    }

    /**
     * Inscriptions actives de l'année sans facture (élèves non supprimés), dans les cycles donnés.
     *
     * @param  list<string>|null  $cycleIds
     * @return Builder<Enrollment>
     */
    public static function pending(AcademicYear $year, ?array $cycleIds): Builder
    {
        return Enrollment::query()
            ->where('academic_year_id', $year->id)
            ->where('status', EnrollmentStatus::Active)
            ->whereHas('student')
            ->whereNotIn('id', Invoice::query()->select('enrollment_id'))
            ->when($cycleIds !== null, static fn (Builder $query) => $query->whereHas(
                'classroom.level',
                static fn (Builder $level) => $level->whereIn('cycle_id', $cycleIds ?? []),
            ));
    }
}
