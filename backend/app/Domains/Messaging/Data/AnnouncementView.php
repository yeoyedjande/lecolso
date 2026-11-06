<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Data;

use App\Domains\Messaging\Models\Announcement;

/** Annonce vue par un utilisateur : droit de la retirer. */
final readonly class AnnouncementView
{
    public function __construct(
        public Announcement $announcement,
        public bool $canDelete,
    ) {}
}
