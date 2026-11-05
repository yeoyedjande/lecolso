<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Models;

use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;

/**
 * Opération hors connexion déjà traitée (clé : UUID de l'appareil) : rejouée, elle renvoie le même résultat.
 *
 * @property string $id
 * @property string $school_id
 * @property string $user_id
 * @property string $type
 * @property string $status
 * @property array<string, mixed> $result
 */
final class SyncOperation extends Model
{
    use BelongsToSchool;

    public $incrementing = false;

    protected $keyType = 'string';

    /** @var list<string> */
    protected $fillable = ['id', 'user_id', 'type', 'status', 'result'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['result' => 'array'];
    }
}
