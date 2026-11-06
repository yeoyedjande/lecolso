<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Http\Controllers;

use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Actions\PublishAnnouncement;
use App\Domains\Messaging\Data\AnnouncementView;
use App\Domains\Messaging\Http\Requests\PublishAnnouncementRequest;
use App\Domains\Messaging\Http\Resources\AnnouncementResource;
use App\Domains\Messaging\Http\Resources\AnnouncementTargetsResource;
use App\Domains\Messaging\Models\Announcement;
use App\Domains\Messaging\Support\AnnouncementAccess;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final readonly class AnnouncementController
{
    private const int LIMIT = 100;

    public function __construct(private AnnouncementAccess $access) {}

    /**
     * Annonces.
     *
     * Celles que l'utilisateur lit (toute l'école, ses cycles, ses classes ; parent : celles de ses enfants), la plus
     * récente d'abord (100 au plus).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $this->user($request);

        return AnnouncementResource::collection($this->access->visible($user)
            ->with(['cycle', 'classroom.level'])
            ->orderByDesc('published_at')
            ->limit(self::LIMIT)
            ->get()
            ->map(fn (Announcement $announcement): AnnouncementView => new AnnouncementView($announcement, $this->access->canDelete($user, $announcement))));
    }

    /**
     * Publics d'annonce possibles.
     *
     * Toute l'école (affectation sans cycle), cycles et classes que l'utilisateur peut viser.
     */
    public function targets(Request $request): AnnouncementTargetsResource
    {
        return new AnnouncementTargetsResource($this->access->targets($this->user($request)));
    }

    /**
     * Publier une annonce.
     *
     * Direction et secrétariat (messaging.announce) pour l'école, leur cycle ou une classe de leur cycle ; le titulaire
     * pour sa classe. Dans l'appli seulement (SMS au lot 10).
     */
    public function store(PublishAnnouncementRequest $request, PublishAnnouncement $publish): AnnouncementResource
    {
        $user = $this->user($request);
        $announcement = $publish->handle(
            $user,
            trim($request->string('title')->toString()),
            trim($request->string('body')->toString()),
            $request->audience(),
            $request->cycleId(),
            $request->classroom(),
            Carbon::now(),
        );

        return new AnnouncementResource(new AnnouncementView($announcement->load(['cycle', 'classroom.level']), true));
    }

    /**
     * Retirer une annonce.
     *
     * Même droit que pour la publier. Annonce que l'utilisateur ne lit pas : 404.
     */
    public function destroy(Request $request, Announcement $announcement): Response
    {
        $user = $this->user($request);
        if (! $this->access->visible($user)->whereKey($announcement->id)->exists()) {
            throw new NotFoundHttpException;
        }
        if (! $this->access->canDelete($user, $announcement)) {
            throw new AuthorizationException;
        }
        $announcement->delete();

        return response()->noContent();
    }

    private function user(Request $request): User
    {
        $user = $request->user();

        return $user instanceof User ? $user : throw new AuthenticationException;
    }
}
