<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Actions\ListConversations;
use App\Domains\Messaging\Actions\MarkConversationRead;
use App\Domains\Messaging\Actions\PostMessage;
use App\Domains\Messaging\Actions\StartConversation;
use App\Domains\Messaging\Http\Requests\ConversationRequest;
use App\Domains\Messaging\Http\Requests\ListConversationsRequest;
use App\Domains\Messaging\Http\Requests\PostMessageRequest;
use App\Domains\Messaging\Http\Requests\StartConversationRequest;
use App\Domains\Messaging\Http\Resources\ConversationDetailResource;
use App\Domains\Messaging\Http\Resources\ConversationResource;
use App\Domains\Messaging\Models\Conversation;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Carbon;

final readonly class ConversationController
{
    public function __construct(private ListConversations $list) {}

    /**
     * Fils de messages.
     *
     * Parent : les siens ; titulaire : ceux de ses classes ; direction et secrétariat : ceux de leurs cycles. Le plus
     * récent d'abord ; `unread=1` : seulement ceux qui ont des messages non lus.
     */
    public function index(ListConversationsRequest $request): AnonymousResourceCollection
    {
        return ConversationResource::collection($this->list->handle($this->user($request), $request->boolean('unread')));
    }

    /**
     * Nombre de fils non lus.
     *
     * Pastille de la navigation.
     *
     * @return array{data: array{count: int}}
     */
    public function unreadCount(Request $request): array
    {
        return ['data' => ['count' => $this->list->unreadCount($this->user($request))]];
    }

    /**
     * Écrire à propos d'un enfant.
     *
     * Le parent écrit au titulaire (`teacher`) ou à l'administration (`office`) ; l'école écrit à un tuteur
     * (`guardian_id`). Un fil existe déjà pour cet enfant, ce tuteur et ce destinataire : le message s'y ajoute.
     * 409 `not_enrolled`, `no_teacher`.
     */
    public function store(StartConversationRequest $request, StartConversation $start): ConversationDetailResource
    {
        $user = $this->user($request);
        $guardianId = $request->filled('guardian_id') ? $request->string('guardian_id')->toString() : null;
        $conversation = $start->handle(
            $user,
            $request->student(),
            $request->channel(),
            trim($request->string('subject')->toString()),
            trim($request->string('body')->toString()),
            $guardianId,
            Carbon::now(),
        );

        return $this->detail($user, $conversation);
    }

    /** Un fil et ses messages. */
    public function show(ConversationRequest $request): ConversationDetailResource
    {
        return $this->detail($this->user($request), $request->conversation());
    }

    /**
     * Répondre dans un fil.
     *
     * Parent du fil, titulaire d'un fil « enseignant », administration d'un fil « administration » (403 sinon).
     */
    public function reply(PostMessageRequest $request, PostMessage $post): ConversationDetailResource
    {
        $user = $this->user($request);
        $post->handle($user, $request->conversation(), trim($request->string('body')->toString()), Carbon::now());

        return $this->detail($user, $request->conversation()->refresh());
    }

    /** Marquer un fil comme lu. */
    public function read(ConversationRequest $request, MarkConversationRead $read): ConversationDetailResource
    {
        $user = $this->user($request);
        $read->handle($user, $request->conversation(), Carbon::now());

        return $this->detail($user, $request->conversation());
    }

    private function detail(User $user, Conversation $conversation): ConversationDetailResource
    {
        return new ConversationDetailResource($this->list->show($user, $conversation));
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
