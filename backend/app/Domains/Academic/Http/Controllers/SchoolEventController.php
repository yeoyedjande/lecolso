<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Controllers;

use App\Domains\Academic\Data\SchoolEventView;
use App\Domains\Academic\Http\Requests\SaveSchoolEventRequest;
use App\Domains\Academic\Http\Requests\SchoolEventsRequest;
use App\Domains\Academic\Http\Resources\SchoolEventResource;
use App\Domains\Academic\Models\SchoolEvent;
use App\Domains\Academic\Support\CalendarAccess;
use App\Domains\Identity\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final readonly class SchoolEventController
{
    public function __construct(private CalendarAccess $access) {}

    /**
     * Calendrier de l'école.
     *
     * Événements qui recoupent `from` → `to` : toute l'école, et ceux des cycles de l'utilisateur (parent : ceux de ses
     * enfants), par date de début.
     */
    public function index(SchoolEventsRequest $request): AnonymousResourceCollection
    {
        $user = $this->user($request);
        $from = $request->string('from')->toString();
        $to = $request->string('to')->toString();

        return SchoolEventResource::collection($this->access->visible($user)
            ->where(static fn (Builder $q) => $q->whereDate('ends_on', '>=', $from)->whereDate('starts_on', '<=', $to))
            ->with('cycle')
            ->orderBy('starts_on')
            ->orderBy('title')
            ->get()
            ->map(fn (SchoolEvent $event): SchoolEventView => new SchoolEventView($event, $this->access->canManage($user, $event->cycle_id))));
    }

    /**
     * Ajouter un événement.
     *
     * school.settings.manage sur toute l'école (événement de toute l'école) ou sur le cycle visé.
     */
    public function store(SaveSchoolEventRequest $request): SchoolEventResource
    {
        $user = $this->user($request);
        $attributes = $request->attributes();
        if (! $this->access->canManage($user, $attributes['cycle_id'])) {
            throw new AuthorizationException;
        }
        $event = SchoolEvent::query()->create([...$attributes, 'created_by' => $user->id]);

        return new SchoolEventResource(new SchoolEventView($event->load('cycle'), true));
    }

    /** Modifier un événement (droit sur son cycle actuel et sur le nouveau). */
    public function update(SaveSchoolEventRequest $request, SchoolEvent $event): SchoolEventResource
    {
        $user = $this->user($request);
        $this->guard($user, $event);
        $attributes = $request->attributes();
        if (! $this->access->canManage($user, $attributes['cycle_id'])) {
            throw new AuthorizationException;
        }
        $event->fill($attributes)->save();

        return new SchoolEventResource(new SchoolEventView($event->load('cycle'), true));
    }

    /** Supprimer un événement. */
    public function destroy(Request $request, SchoolEvent $event): Response
    {
        $this->guard($this->user($request), $event);
        $event->delete();

        return response()->noContent();
    }

    /** Événement que l'utilisateur ne voit pas : 404 ; qu'il voit sans le gérer : 403. */
    private function guard(User $user, SchoolEvent $event): void
    {
        if (! $this->access->visible($user)->whereKey($event->id)->exists()) {
            throw new NotFoundHttpException;
        }
        if (! $this->access->canManage($user, $event->cycle_id)) {
            throw new AuthorizationException;
        }
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
