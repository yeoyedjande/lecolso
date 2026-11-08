<?php

declare(strict_types=1);

use Symfony\Component\Finder\Finder;

/*
| Règles d'architecture vérifiées sur le code source (app/).
| La connexion super-admin (BYPASSRLS) n'est accessible que par Platform::run(), et Platform n'est utilisé
| que par les Actions des routes /api/v1/platform/*. Un nouvel usage fait échouer la CI : c'est voulu,
| il doit être ajouté à la liste ci-dessous et justifié en revue.
*/

/**
 * Fichiers PHP de app/ (hors exceptions listées) qui contiennent $needle.
 *
 * @param  list<string>  $allowed  chemins relatifs à app/
 * @return list<string>
 */
function appFilesContaining(string $needle, array $allowed = []): array
{
    $found = [];

    foreach (Finder::create()->files()->in(app_path())->name('*.php')->sortByName() as $file) {
        if (! in_array($file->getRelativePathname(), $allowed, true) && str_contains($file->getContents(), $needle)) {
            $found[] = $file->getRelativePathname();
        }
    }

    return $found;
}

it('n’utilise Platform que dans les Actions super-admin', function (): void {
    // Tout usage hors de son espace de noms passe par cet import
    expect(appFilesContaining('use App\\Support\\Tenancy\\Platform;', [
        // Routes /api/v1/platform/* (middleware EnsureSuperAdmin)
        'Domains/Tenancy/Actions/CreateSchool.php',
        'Domains/Tenancy/Actions/ListAllSchools.php',
        // Commande platform:create-super-admin (mise en place d'une base vide, lancée à la main)
        'Domains/Identity/Actions/CreateSuperAdmin.php',
    ]))->toBe([]);

    // Dans App\Support\Tenancy, seul BelongsToSchool s'en sert (pas de filtre Eloquent dans Platform::run)
    expect(array_values(array_filter(
        appFilesContaining('Platform::'),
        static fn (string $file): bool => str_starts_with($file, 'Support/Tenancy/'),
    )))->toBe(['Support/Tenancy/BelongsToSchool.php', 'Support/Tenancy/Platform.php']);
});

it('ne nomme la connexion super-admin que dans Platform', function (): void {
    expect(appFilesContaining('pgsql_platform', [
        'Support/Tenancy/Platform.php',
        // Pré-déploiement : lit seulement le nom et le mot de passe du rôle app_platform pour le créer (aucune requête)
        'Console/Commands/ProvisionAppRole.php',
    ]))->toBe([]);
});

it('n’utilise withoutGlobalScope(s) qu’à l’endroit justifié', function (): void {
    // Exceptions : RoleAssignment::ofUser() (ses propres affectations dans toutes ses écoles) et SchoolRole::ofSchool()
    // (rôles des écoles où l'on a une affectation), garanties par la RLS
    expect(appFilesContaining('withoutGlobalScope', [
        'Domains/Identity/Models/RoleAssignment.php',
        'Domains/Identity/Models/SchoolRole.php',
    ]))->toBe([]);
});
