<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Resources;

use App\Domains\Tenancy\Data\HealthReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Symfony\Component\HttpFoundation\Response;

/**
 * @property-read HealthReport $resource
 */
final class HealthResource extends JsonResource
{
    /**
     * Réponse à plat (sans clé « data ») : format attendu par les healthchecks.
     *
     * @var string|null
     */
    public static $wrap = null;

    public function __construct(HealthReport $resource)
    {
        parent::__construct($resource);
    }

    /**
     * @return array{status: 'ok'|'error', database: 'ok'|'error', redis: 'ok'|'error'}
     */
    public function toArray(Request $request): array
    {
        return [
            'status' => $this->resource->status()->value,
            'database' => $this->resource->database->value,
            'redis' => $this->resource->redis->value,
        ];
    }

    /**
     * 200 si tout répond, 503 sinon : Railway s'appuie sur le code HTTP.
     */
    public function withResponse(Request $request, JsonResponse $response): void
    {
        $response->setStatusCode(
            $this->resource->isHealthy() ? Response::HTTP_OK : Response::HTTP_SERVICE_UNAVAILABLE,
        );
    }
}
