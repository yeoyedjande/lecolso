<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Models;

use App\Support\Tenancy\BelongsToSchool;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Lecture d'un fil par un compte : les messages de l'autre côté envoyés après `read_at` sont non lus.
 *
 * @property string $id
 * @property string $school_id
 * @property string $conversation_id
 * @property string $user_id
 * @property Carbon $read_at
 */
final class ConversationRead extends Model
{
    use BelongsToSchool;
    use HasUuids;

    /** @var list<string> */
    protected $fillable = ['conversation_id', 'user_id', 'read_at'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }
}
