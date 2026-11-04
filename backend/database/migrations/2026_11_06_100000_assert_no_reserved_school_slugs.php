<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Routage par chemin (ADR 0005) : une école existante dont le slug est devenu un segment réservé
 * (config/tenancy.php) rendrait sa page inaccessible ou masquerait une route de l'application.
 * Aucun renommage automatique (les liens déjà envoyés casseraient sans prévenir) : la migration échoue
 * et liste les écoles à renommer à la main avant de déployer.
 */
return new class extends Migration
{
    public function up(): void
    {
        /** @var list<string> $reserved */
        $reserved = config()->array('tenancy.reserved_slugs');

        // SQL direct justifié : vérification ponctuelle par le rôle propriétaire (migrations), sur toutes
        // les écoles, supprimées comprises (le slug reste unique) ; aucune écriture.
        $conflicts = array_filter(
            DB::table('schools')->whereIn('slug', $reserved)->orderBy('slug')->pluck('slug')->all(),
            is_string(...),
        );

        if ($conflicts !== []) {
            throw new RuntimeException('Slugs d’école réservés à renommer avant le déploiement : '.implode(', ', $conflicts));
        }
    }

    public function down(): void
    {
        // Vérification seulement : rien à défaire
    }
};
