<?php

declare(strict_types=1);

namespace App\Domains\Billing\Models;

use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Billing\Support\Amount;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Student;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Facture d'une inscription (une par élève et par année), adressée au payeur. Total = somme des lignes.
 *
 * @property string $id
 * @property string $school_id
 * @property string $enrollment_id
 * @property string $student_id
 * @property string $academic_year_id
 * @property string|null $payer_id
 * @property-read Enrollment $enrollment
 * @property-read Student $student
 * @property-read Student $studentRecord
 * @property-read AcademicYear $academicYear
 * @property-read Payer|null $payer
 * @property-read Collection<int, InvoiceLine> $lines
 * @property-read Collection<int, Installment> $installments
 * @property-read Collection<int, Payment> $payments
 * @property-read Collection<int, Refund> $refunds
 * @property-read Collection<int, CreditTransfer> $transfersOut
 * @property-read Collection<int, CreditTransfer> $transfersIn
 */
final class Invoice extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['enrollment_id', 'student_id', 'academic_year_id', 'payer_id'];

    /**
     * @return BelongsTo<Enrollment, $this>
     */
    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(Enrollment::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * Élève, même supprimé (suppression logique) : l'historique comptable (reçus, caisse, reports) reste lisible.
     *
     * @return BelongsTo<Student, $this>
     */
    public function studentRecord(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id')->withTrashed();
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * @return BelongsTo<Payer, $this>
     */
    public function payer(): BelongsTo
    {
        return $this->belongsTo(Payer::class);
    }

    /**
     * Lignes : frais d'abord (ordre des types), puis lignes manuelles et remises.
     *
     * @return HasMany<InvoiceLine, $this>
     */
    public function lines(): HasMany
    {
        return $this->hasMany(InvoiceLine::class)->orderBy('created_at')->orderBy('id');
    }

    /**
     * @return HasMany<Installment, $this>
     */
    public function installments(): HasMany
    {
        return $this->hasMany(Installment::class)->orderBy('due_on');
    }

    /**
     * Paiements, du plus récent au plus ancien (annulés compris).
     *
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class)->orderByDesc('paid_at')->orderByDesc('receipt_number');
    }

    /**
     * @return HasMany<Refund, $this>
     */
    public function refunds(): HasMany
    {
        return $this->hasMany(Refund::class)->orderByDesc('created_at');
    }

    /**
     * Trop-perçus reportés vers une autre facture.
     *
     * @return HasMany<CreditTransfer, $this>
     */
    public function transfersOut(): HasMany
    {
        return $this->hasMany(CreditTransfer::class, 'from_invoice_id')->orderByDesc('created_at');
    }

    /**
     * Trop-perçus reçus d'une autre facture.
     *
     * @return HasMany<CreditTransfer, $this>
     */
    public function transfersIn(): HasMany
    {
        return $this->hasMany(CreditTransfer::class, 'to_invoice_id')->orderByDesc('created_at');
    }

    /** Total de la facture (FCFA). */
    public function total(): int
    {
        return Amount::sum($this->lines);
    }
}
