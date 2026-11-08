<?php

declare(strict_types=1);

namespace App\Domains\Students\Actions;

use App\Domains\Academic\Models\Level;
use App\Domains\Students\Data\PreRegistrationInput;
use App\Domains\Students\Enums\PreRegistrationStatus;
use App\Domains\Students\Models\PreRegistration;
use App\Support\Http\BusinessConflict;
use App\Support\Sequences\Sequence;
use App\Support\Tenancy\TenantContext;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Pré-inscription envoyée depuis la page publique, sans connexion. L'école est retrouvée par `public_school_id`
 * (SECURITY DEFINER, identifiant seulement), puis la demande s'écrit sous la RLS de cette école. Une même demande
 * renvoyée (même enfant, même date de naissance, même téléphone, encore en attente) n'est pas dupliquée : on rend son
 * numéro, même pour deux envois simultanés (verrou par école et téléphone). Au plus MAX_PENDING_PER_PHONE demandes
 * en attente par téléphone et par école.
 */
final readonly class SubmitPreRegistration
{
    public const int MAX_PENDING_PER_PHONE = 5;

    public function __construct(
        private TenantContext $context,
        private Sequence $sequence,
    ) {}

    /**
     * @return PreRegistration|null null : école inconnue (404)
     *
     * @throws BusinessConflict too_many_pending
     * @throws ValidationException level (niveau inconnu dans cette école)
     */
    public function handle(string $slug, PreRegistrationInput $input, Carbon $now): ?PreRegistration
    {
        // SQL brut justifié : fonction SECURITY DEFINER qui ne renvoie que l'identifiant de l'école du slug
        $schoolId = DB::connection(TenantContext::CONNECTION)->scalar('select public_school_id(?)', [$slug]);
        if (! is_string($schoolId)) {
            return null;
        }

        return $this->context->run($schoolId, fn (): PreRegistration => DB::transaction(function () use ($schoolId, $input, $now): PreRegistration {
            // Envois simultanés pour un même téléphone (double clic, nouvel essai) : verrou consultatif de transaction
            // pris avant la lecture des demandes en attente (un FOR UPDATE ne verrouille aucune ligne quand il n'y en
            // a pas encore). SQL brut justifié : aucune table lue, seulement le verrou.
            DB::select('SELECT pg_advisory_xact_lock(hashtext(?))', ['pre_registration:'.$schoolId.':'.$input->guardianPhone]);

            $level = Level::query()
                ->where('code', $input->levelCode)
                ->whereHas('cycle', static fn ($cycle) => $cycle->where('code', $input->cycleCode)->where('is_active', true))
                ->first() ?? throw ValidationException::withMessages(['level_code' => 'Ce niveau n’est pas proposé par l’école.']);

            $pending = PreRegistration::query()
                ->where('guardian_phone', $input->guardianPhone)
                ->where('status', PreRegistrationStatus::Pending)
                ->get();
            $same = $pending->first(static fn (PreRegistration $existing): bool => $existing->level_id === $level->id
                && mb_strtolower($existing->child_last_name) === mb_strtolower($input->childLastName)
                && mb_strtolower($existing->child_first_name) === mb_strtolower($input->childFirstName)
                && $existing->child_birth_date->toDateString() === $input->childBirthDate);
            if ($same !== null) {
                return $same;
            }
            if ($pending->count() >= self::MAX_PENDING_PER_PHONE) {
                throw new BusinessConflict('too_many_pending', 'Plusieurs demandes sont déjà en attente pour ce numéro : l’école vous recontactera.');
            }

            $year = (int) $now->copy()->setTimezone('Africa/Abidjan')->format('Y');

            return PreRegistration::query()->create([
                'reference' => sprintf('PRE-%d-%06d', $year, $this->sequence->next('pre_registration:'.$year)),
                'level_id' => $level->id,
                'child_last_name' => $input->childLastName,
                'child_first_name' => $input->childFirstName,
                'child_gender' => $input->childGender,
                'child_birth_date' => $input->childBirthDate,
                'guardian_name' => $input->guardianName,
                'guardian_phone' => $input->guardianPhone,
                'guardian_email' => $input->guardianEmail,
                'message' => $input->message,
                'status' => PreRegistrationStatus::Pending,
            ]);
        }));
    }
}
