<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Messaging\Listeners\FollowStudentClass;
use App\Domains\Messaging\Models\Conversation;
use App\Domains\Students\Events\StudentChangedClass;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/** Messagerie : paramètres de route (sous la RLS de l'école courante), fils qui suivent la classe de l'élève. */
final class MessagingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::model('conversation', Conversation::class);
        Event::listen(StudentChangedClass::class, FollowStudentClass::class);
    }
}
