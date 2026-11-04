<?php

declare(strict_types=1);

namespace App\Domains\Identity\Models;

use App\Support\Audit\Auditable;
use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Compte désactivé dans une école : accès coupé (droits, /me, en-tête X-School-Id), affectations conservées
 * pour la réactivation. Une ligne par (école, utilisateur).
 *
 * @property string $id
 * @property string $school_id
 * @property string $user_id
 * @property string|null $deactivated_by
 */
final class MemberDeactivation extends Model
{
    use Auditable;
    use BelongsToSchool;
    use HasUuids;

    protected $table = 'member_deactivations';

    /** @var list<string> */
    protected $fillable = ['user_id', 'deactivated_by'];

    /** Le compte est-il désactivé dans l'école courante ? */
    public static function isDeactivated(string $userId): bool
    {
        return self::query()->where('user_id', $userId)->exists();
    }
}
