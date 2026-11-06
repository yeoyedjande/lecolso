<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domains\Messaging\Models\Conversation;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

/** Messagerie : paramètres de route (sous la RLS de l'école courante). */
final class MessagingServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::model('conversation', Conversation::class);
    }
}
