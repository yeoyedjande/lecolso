<?php

declare(strict_types=1);

namespace App\Domains\Messaging\Sms;

use App\Domains\Messaging\Contracts\SmsSender;
use App\Support\Phone\Phone;
use Psr\Log\LoggerInterface;

/**
 * SMS factices (local et tests) : gardés en mémoire et signalés dans le log, téléphone masqué
 * et sans le contenu du message (il peut citer un enfant : règle 5).
 */
final class FakeSmsSender implements SmsSender
{
    /** @var list<array{to: string, message: string}> */
    private array $sent = [];

    public function __construct(private readonly LoggerInterface $logger) {}

    public function send(string $to, string $message): void
    {
        $this->sent[] = ['to' => $to, 'message' => $message];

        $this->logger->info('sms.fake_sent', ['to' => Phone::mask($to), 'length' => mb_strlen($message)]);
    }

    /**
     * @return list<array{to: string, message: string}>
     */
    public function sent(): array
    {
        return $this->sent;
    }
}
