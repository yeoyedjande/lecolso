<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Support;

use App\Domains\Identity\Authorization\Authorizer;
use App\Domains\Identity\Authorization\StaffScope;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Enums\ConversationChannel;
use App\Domains\Messaging\Enums\MessageSide;
use App\Domains\Messaging\Models\Conversation;
use App\Domains\Students\Models\Guardian;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\Builder;

/**
 * Droits de la messagerie (décision du 06/11/2026) :
 * - le parent (rôle Parent, tuteur de même téléphone que le compte) : ses seuls fils ;
 * - le titulaire de la classe du fil (messaging.send) : les fils « enseignant », qu'il lit et auxquels il répond ;
 * - le personnel du cycle (messaging.send hors rôles Parent et Enseignant : direction, secrétariat) : les fils
 *   « administration » (lecture et réponse) et la lecture seule des fils « enseignant ».
 */
final class ConversationAccess
{
    private const string PERMISSION = 'messaging.send';

    /** @var array<string, list<string>> tuteurs par compte et école (mémorisés le temps d'une requête) */
    private array $guardians = [];

    /** @var array<string, list<string>|null> cycles du personnel par compte et école */
    private array $cycles = [];

    public function __construct(
        private readonly Authorizer $authorizer,
        private readonly StaffScope $staff,
        private readonly TenantContext $context,
    ) {}

    /**
     * Tuteurs de l'école que représente ce compte (rôle Parent et même téléphone), vide sinon.
     *
     * @return list<string>
     */
    public function guardianIds(User $user): array
    {
        $schoolId = $this->context->schoolId();
        if ($schoolId === null) {
            return [];
        }
        $key = $user->id.':'.$schoolId;
        if (! array_key_exists($key, $this->guardians)) {
            $isGuardian = $this->authorizer->assignments($user, $schoolId)
                ->contains(static fn (RoleAssignment $assignment): bool => $assignment->role === Role::Guardian->value);
            $ids = $isGuardian ? Guardian::query()->where('phone', $user->phone)->pluck('id')->all() : [];
            $this->guardians[$key] = array_values(array_filter($ids, is_string(...)));
        }

        return $this->guardians[$key];
    }

    public function isGuardianOf(User $user, Conversation $conversation): bool
    {
        return in_array($conversation->guardian_id, $this->guardianIds($user), true);
    }

    public function isHomeroom(User $user, Conversation $conversation): bool
    {
        $schoolId = $this->context->schoolId();
        $conversation->loadMissing('classroom');

        return $schoolId !== null
            && $conversation->classroom->homeroom_teacher_id === $user->id
            && $this->authorizer->allows($user, self::PERMISSION, $schoolId, $conversation->cycle_id);
    }

    public function isOffice(User $user, string $cycleId): bool
    {
        $cycles = $this->officeCycles($user);

        return $cycles === null || in_array($cycleId, $cycles, true);
    }

    /**
     * Cycles où le compte agit comme personnel (null = toute l'école).
     *
     * @return list<string>|null
     */
    public function officeCycles(User $user): ?array
    {
        $key = $user->id.':'.($this->context->schoolId() ?? '');
        if (! array_key_exists($key, $this->cycles)) {
            $this->cycles[$key] = $this->staff->cycles($user, self::PERMISSION);
        }

        return $this->cycles[$key];
    }

    public function canRead(User $user, Conversation $conversation): bool
    {
        return $this->isGuardianOf($user, $conversation)
            || $this->isOffice($user, $conversation->cycle_id)
            || ($conversation->channel === ConversationChannel::Teacher && $this->isHomeroom($user, $conversation));
    }

    public function canWrite(User $user, Conversation $conversation): bool
    {
        if ($this->isGuardianOf($user, $conversation)) {
            return true;
        }

        return $conversation->channel === ConversationChannel::Teacher
            ? $this->isHomeroom($user, $conversation)
            : $this->isOffice($user, $conversation->cycle_id);
    }

    /** Côté du compte dans ce fil : parent s'il en est le tuteur, sinon école. */
    public function sideOf(User $user, Conversation $conversation): MessageSide
    {
        return $this->isGuardianOf($user, $conversation) ? MessageSide::Guardian : MessageSide::School;
    }

    /**
     * Fils que le compte peut voir (à confirmer par canRead) : les siens comme parent, ceux de ses classes comme titulaire, ceux de ses cycles
     * comme personnel.
     *
     * @return Builder<Conversation>
     */
    public function query(User $user): Builder
    {
        $guardians = $this->guardianIds($user);
        $cycles = $this->officeCycles($user);

        // Candidats ; le titulaire est confirmé ensuite par canRead (permission sur le cycle)
        return Conversation::query()->where(static function (Builder $where) use ($guardians, $cycles, $user): void {
            $where->whereIn('guardian_id', $guardians);
            if ($cycles === null) {
                $where->orWhereRaw('true');
            } elseif ($cycles !== []) {
                $where->orWhereIn('cycle_id', $cycles);
            }
            $where->orWhere(static fn (Builder $mine) => $mine->where('channel', ConversationChannel::Teacher)
                ->whereHas('classroom', static fn (Builder $classroom) => $classroom->where('homeroom_teacher_id', $user->id)));
        });
    }
}
