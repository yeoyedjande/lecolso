<?php

declare(strict_types=1);

use App\Domains\Messaging\Contracts\SmsSender;
use App\Domains\Messaging\Sms\FakeSmsSender;
use App\Domains\Messaging\Sms\UnconfiguredSmsSender;
use Psr\Log\AbstractLogger;

it('utilise le faux expéditeur hors production', function (): void {
    expect(app(SmsSender::class))->toBeInstanceOf(FakeSmsSender::class);
});

it('garde les SMS factices en mémoire, sans journaliser le numéro ni le message', function (): void {
    $logger = new class extends AbstractLogger
    {
        /** @var list<array{message: string, context: array<mixed>}> */
        public array $records = [];

        public function log($level, string|Stringable $message, array $context = []): void
        {
            $this->records[] = ['message' => (string) $message, 'context' => $context];
        }
    };
    $sender = new FakeSmsSender($logger);

    $sender->send('+2250701020304', 'Aya est absente ce matin.');

    expect($sender->sent())->toBe([['to' => '+2250701020304', 'message' => 'Aya est absente ce matin.']])
        ->and($logger->records)->toBe([[
            'message' => 'sms.fake_sent',
            'context' => ['to' => '+225********04', 'length' => 25],
        ]]);
});

it('refuse d’envoyer en production tant qu’aucun fournisseur n’est configuré', function (): void {
    app()->detectEnvironment(static fn (): string => 'production');
    app()->forgetInstance(SmsSender::class);

    $sender = app(SmsSender::class);

    expect($sender)->toBeInstanceOf(UnconfiguredSmsSender::class)
        ->and(static fn () => $sender->send('+2250701020304', 'x'))->toThrow(RuntimeException::class);
});
