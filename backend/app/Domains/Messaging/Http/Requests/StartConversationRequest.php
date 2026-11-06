<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Requests;

use App\Domains\Messaging\Enums\ConversationChannel;
use App\Domains\Students\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Écrire à propos d'un enfant : `student_id`, `channel` (teacher : le titulaire, office : l'administration),
 * `subject` (120 caractères), `body` (2000 caractères), et côté école `guardian_id` (tuteur de l'enfant).
 * Les droits sont vérifiés par l'Action (parent de l'enfant, titulaire, personnel du cycle).
 */
final class StartConversationRequest extends FormRequest
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
            'student_id' => ['required', 'uuid'],
            'channel' => ['required', Rule::enum(ConversationChannel::class)],
            'subject' => ['required', 'string', 'min:2', 'max:120'],
            'body' => ['required', 'string', 'max:2000'],
            'guardian_id' => ['nullable', 'uuid'],
        ];
    }

    public function student(): Student
    {
        // Sous la RLS de l'école courante : élève d'une autre école introuvable
        return Student::query()->find($this->string('student_id')->toString()) ?? throw new NotFoundHttpException;
    }

    public function channel(): ConversationChannel
    {
        return ConversationChannel::from($this->string('channel')->toString());
    }
}
