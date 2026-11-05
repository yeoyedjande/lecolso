<?php

declare(strict_types=1);

namespace App\Domains\Students\Models;

use App\Domains\Students\Enums\BloodType;
use App\Domains\Students\Enums\Gender;
use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Élève de l'école. Matricule attribué à la première inscription, jamais réutilisé (suppression logique).
 * blood_type, allergies, medical_notes : données médicales (students.medical.view), jamais journalisées.
 *
 * @property string $id
 * @property string $school_id
 * @property string $matricule
 * @property string $first_name
 * @property string $last_name
 * @property Gender $gender
 * @property Carbon $birth_date
 * @property string|null $birth_place
 * @property string|null $address
 * @property BloodType|null $blood_type
 * @property string|null $allergies
 * @property string|null $medical_notes
 * @property Carbon|null $created_at
 * @property Carbon|null $deleted_at
 * @property-read Collection<int, Enrollment> $enrollments
 * @property-read Collection<int, GuardianLink> $guardianLinks
 */
final class Student extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;
    use SoftDeletes;

    /** @var list<string> */
    protected $fillable = [
        'first_name', 'last_name', 'gender', 'birth_date', 'birth_place', 'address',
        'blood_type', 'allergies', 'medical_notes',
    ];

    /** Nom affiché : « NOM Prénom », comme sur les listes d'appel. */
    public function fullName(): string
    {
        return mb_strtoupper($this->last_name).' '.$this->first_name;
    }

    /**
     * Inscriptions, de la plus récente à la plus ancienne (année).
     *
     * @return HasMany<Enrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /**
     * Liens avec les tuteurs (contact principal d'abord).
     *
     * @return HasMany<GuardianLink, $this>
     */
    public function guardianLinks(): HasMany
    {
        return $this->hasMany(GuardianLink::class)->orderByDesc('is_primary_contact')->orderBy('created_at');
    }

    /**
     * matricule : attribué par l'Action d'inscription.
     *
     * @return list<string>
     */
    protected function auditInclude(): array
    {
        return ['matricule'];
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'gender' => Gender::class,
            'birth_date' => 'date',
            'blood_type' => BloodType::class,
        ];
    }
}
