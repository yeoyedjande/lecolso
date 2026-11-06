<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Requests;

use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Messaging\Enums\AnnouncementAudience;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Publier une annonce : `title` (120 caractères), `body` (2000), `audience` (school, cycle, classroom) et selon le
 * public `cycle_id` ou `classroom_id`. Les droits sont vérifiés par l'Action (publics de l'utilisateur).
 */
final class PublishAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:2', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            'audience' => ['required', Rule::enum(AnnouncementAudience::class)],
            'cycle_id' => ['nullable', 'uuid', 'required_if:audience,cycle'],
            'classroom_id' => ['nullable', 'uuid', 'required_if:audience,classroom'],
        ];
    }

    public function audience(): AnnouncementAudience
    {
        return AnnouncementAudience::from($this->string('audience')->toString());
    }

    /** Cycle visé, sous la RLS de l'école courante (autre école : erreur de validation). */
    public function cycleId(): ?string
    {
        if ($this->audience() !== AnnouncementAudience::Cycle) {
            return null;
        }
        $cycle = Cycle::query()->find($this->string('cycle_id')->toString());

        return $cycle === null ? throw ValidationException::withMessages(['cycle_id' => 'Cycle inconnu.']) : $cycle->id;
    }

    /** Classe visée, sous la RLS de l'école courante (autre école : erreur de validation). */
    public function classroom(): ?Classroom
    {
        if ($this->audience() !== AnnouncementAudience::Classroom) {
            return null;
        }

        return Classroom::query()->with('level')->find($this->string('classroom_id')->toString())
            ?? throw ValidationException::withMessages(['classroom_id' => 'Classe inconnue.']);
    }
}
