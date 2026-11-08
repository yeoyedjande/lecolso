<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Students\Data\GuardianInput;
use App\Domains\Students\Enums\GuardianRelation;
use App\Domains\Students\Events\StudentPayerChanged;
use App\Domains\Students\Models\Guardian;
use App\Domains\Students\Models\GuardianLink;
use App\Domains\Students\Models\Student;
use App\Domains\Students\Support\GuardianDirectory;
use App\Support\Http\BusinessConflict;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Tuteurs du dossier d'un élève. Règles : au moins un tuteur ; exactement un payeur et un contact principal
 * (désigner un autre tuteur retire la qualité au précédent) ; un tuteur sans plus aucun élève est effacé, avec sa photo.
 * Les informations d'un tuteur (nom, téléphone…) sont partagées par toute la fratrie.
 */
final readonly class ManageGuardians
{
    public function __construct(
        private GuardianDirectory $directory,
        private ManagePhotos $photos,
    ) {}

    /**
     * @throws ValidationException tuteur déjà lié à l'élève
     */
    public function add(Student $student, GuardianInput $input): GuardianLink
    {
        return DB::transaction(function () use ($student, $input): GuardianLink {
            $guardian = $this->directory->findOrCreate($input);

            if (GuardianLink::query()->where('student_id', $student->id)->where('guardian_id', $guardian->id)->exists()) {
                throw ValidationException::withMessages(['phone' => 'Ce tuteur est déjà lié à l’élève.']);
            }

            $first = ! GuardianLink::query()->where('student_id', $student->id)->exists();

            return $this->saveLink(new GuardianLink(['student_id' => $student->id, 'guardian_id' => $guardian->id]), [
                'relation' => $input->relation,
                'is_primary_contact' => $input->isPrimaryContact || $first,
                'is_payer' => $input->isPayer || $first,
                'can_pick_up' => $input->canPickUp,
            ]);
        });
    }

    /**
     * @param  array{name?: string, phone?: string, email?: string|null, profession?: string|null}  $guardianAttributes
     * @param  array{relation?: GuardianRelation, is_primary_contact?: bool, is_payer?: bool, can_pick_up?: bool}  $linkAttributes
     *
     * @throws ValidationException téléphone d'un autre tuteur, retrait du payeur ou du contact principal sans remplaçant
     */
    public function update(GuardianLink $link, array $guardianAttributes, array $linkAttributes): GuardianLink
    {
        if (($linkAttributes['is_payer'] ?? true) === false && $link->is_payer) {
            throw ValidationException::withMessages(['is_payer' => 'Désignez un autre tuteur comme payeur.']);
        }

        if (($linkAttributes['is_primary_contact'] ?? true) === false && $link->is_primary_contact) {
            throw ValidationException::withMessages(['is_primary_contact' => 'Désignez un autre tuteur comme contact principal.']);
        }

        return DB::transaction(function () use ($link, $guardianAttributes, $linkAttributes): GuardianLink {
            $phone = $guardianAttributes['phone'] ?? null;
            if ($phone !== null && Guardian::query()->where('phone', $phone)->whereKeyNot($link->guardian_id)->exists()) {
                throw ValidationException::withMessages(['phone' => 'Ce numéro est déjà celui d’un autre tuteur de l’école.']);
            }

            if ($guardianAttributes !== []) {
                $link->guardian->fill($guardianAttributes)->save();

                // Nom du payeur sur les factures de chaque enfant dont ce tuteur paie la scolarité
                if (array_key_exists('name', $guardianAttributes)) {
                    GuardianLink::query()->where('guardian_id', $link->guardian_id)->where('is_payer', true)->get()
                        ->each(static fn (GuardianLink $paying) => StudentPayerChanged::dispatch($paying->school_id, $paying->student_id));
                }
            }

            return $this->saveLink($link, $linkAttributes);
        });
    }

    /**
     * @throws BusinessConflict last_guardian, reassign_first
     */
    public function remove(GuardianLink $link): void
    {
        $others = GuardianLink::query()->where('student_id', $link->student_id)->whereKeyNot($link->id)->count();

        if ($others === 0) {
            throw new BusinessConflict('last_guardian', 'L’élève doit garder au moins un tuteur.');
        }

        if ($link->is_payer || $link->is_primary_contact) {
            throw new BusinessConflict('reassign_first', 'Désignez d’abord un autre payeur et un autre contact principal.');
        }

        $orphanPhoto = DB::transaction(static function () use ($link): ?string {
            $guardianId = $link->guardian_id;
            $link->delete();

            if (GuardianLink::query()->where('guardian_id', $guardianId)->exists()) {
                return null;
            }

            $guardian = Guardian::query()->find($guardianId);
            $guardian?->delete();

            return $guardian?->photo_path;
        });

        // Fichier effacé après la transaction : une annulation laisserait sinon un tuteur sans sa photo
        $this->photos->forget($orphanPhoto);
    }

    /**
     * Enregistre le lien ; un nouveau payeur ou contact principal retire d'abord la qualité au précédent.
     *
     * @param  array<string, mixed>  $attributes
     */
    private function saveLink(GuardianLink $link, array $attributes): GuardianLink
    {
        foreach (['is_payer', 'is_primary_contact'] as $flag) {
            if (($attributes[$flag] ?? false) === true) {
                GuardianLink::query()
                    ->where('student_id', $link->student_id)
                    ->when($link->exists, static fn ($query) => $query->whereKeyNot($link->id))
                    ->where($flag, true)
                    ->update([$flag => false]);
            }
        }

        $link->fill($attributes)->save();

        if (($attributes['is_payer'] ?? false) === true) {
            StudentPayerChanged::dispatch($link->school_id, $link->student_id);
        }

        return $link;
    }
}
