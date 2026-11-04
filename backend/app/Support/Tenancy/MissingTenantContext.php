<?php

declare(strict_types=1);

namespace App\Support\Tenancy;

use LogicException;

/** Écriture d'une donnée d'établissement sans école courante, ou pour une autre école. */
final class MissingTenantContext extends LogicException {}
