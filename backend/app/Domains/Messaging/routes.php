<?php

declare(strict_types=1);

// Routes du domaine Messaging, chargées sous /api/v1 par App\Support\Routing\DomainRoutes.

use App\Domains\Messaging\Http\Controllers\ConversationController;
use Illuminate\Support\Facades\Route;

// Routes d'un établissement (en-tête X-School-Id)
Route::middleware(['auth:sanctum', 'school'])->group(static function (): void {
    Route::get('conversations', [ConversationController::class, 'index'])->name('conversations.index');
    Route::get('conversations/unread-count', [ConversationController::class, 'unreadCount'])->name('conversations.unread');
    Route::post('conversations', [ConversationController::class, 'store'])->name('conversations.store');
    Route::get('conversations/{conversation}', [ConversationController::class, 'show'])->name('conversations.show');
    Route::post('conversations/{conversation}/messages', [ConversationController::class, 'reply'])->name('conversations.reply');
    Route::post('conversations/{conversation}/read', [ConversationController::class, 'read'])->name('conversations.read');
});
