<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Domains\Tenancy\Models\School;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\Support\SpaClient;

use function Pest\Laravel\get;

/** Fichier image envoyé par le navigateur (PNG généré). */
function pngUpload(int $width = 800, int $height = 400, string $name = 'logo.png'): UploadedFile
{
    $image = imagecreatetruecolor(max(1, $width), max(1, $height));
    imagefill($image, 0, 0, (int) imagecolorallocate($image, 30, 60, 120));
    $path = tempnam(sys_get_temp_dir(), 'logo').'.png';
    imagepng($image, $path);

    return new UploadedFile($path, $name, 'image/png', null, true);
}

/**
 * Envoi multipart du logo dans l'école (session du navigateur).
 *
 * @return TestResponse<Response>
 */
function uploadLogo(School $school, UploadedFile $file): TestResponse
{
    return SpaClient::upload('/api/v1/school/logo', ['logo' => $file], ['X-School-Id' => $school->id]);
}

/** Chemin + paramètres de l'URL signée (le test appelle l'application sans passer par l'hôte). */
function relativeUrl(string $url): string
{
    $parts = parse_url($url);
    \assert(is_array($parts));

    return ($parts['path'] ?? '').'?'.($parts['query'] ?? '');
}

function ownerSchoolValue(School $school, string $column): mixed
{
    return DB::connection('pgsql_owner')->scalar("select {$column} from schools where id = ?", [$school->id]);
}

beforeEach(function (): void {
    Storage::fake();
});

it('donne l’identité de l’école à tout membre', function (): void {
    $school = makeSchool([], ['name' => 'Les Lauriers', 'city' => 'Abidjan']);
    actingAsRole(Role::Teacher, $school);

    spa('GET', '/api/v1/school', [], $school)
        ->assertOk()
        ->assertJsonPath('data.id', $school->id)
        ->assertJsonPath('data.name', 'Les Lauriers')
        ->assertJsonPath('data.city', 'Abidjan')
        ->assertJsonPath('data.address', null)
        ->assertJsonPath('data.logo_url', null);
});

it('permet à la direction de modifier l’identité de l’école', function (): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    spa('PATCH', '/api/v1/school', [
        'name' => 'Groupe scolaire Les Lauriers',
        'address' => 'Cocody, rue des Jardins',
        'phone' => '27 22 44 55 66',
        'email' => 'Contact@Lauriers.ci',
        'motto' => 'Apprendre, grandir, réussir',
    ], $school)
        ->assertOk()
        ->assertJsonPath('data.name', 'Groupe scolaire Les Lauriers')
        ->assertJsonPath('data.phone', '+2252722445566')
        ->assertJsonPath('data.email', 'contact@lauriers.ci')
        ->assertJsonPath('data.motto', 'Apprendre, grandir, réussir');

    // Chaîne vide : champ effacé ; champ absent : inchangé
    spa('PATCH', '/api/v1/school', ['motto' => ''], $school)
        ->assertOk()
        ->assertJsonPath('data.motto', null)
        ->assertJsonPath('data.address', 'Cocody, rue des Jardins');
});

it('valide l’identité de l’école', function (array $payload, string $field): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    spa('PATCH', '/api/v1/school', $payload, $school)->assertUnprocessable()->assertJsonValidationErrors([$field]);
})->with([
    'nom vide' => [['name' => ''], 'name'],
    'téléphone invalide' => [['phone' => '123'], 'phone'],
    'e-mail invalide' => [['email' => 'pas-un-email'], 'email'],
    'devise trop longue' => [['motto' => str_repeat('a', 121)], 'motto'],
]);

it('réserve la modification à qui gère les paramètres de toute l’école', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);

    actingAsRole(Role::Secretary, $school);
    spa('PATCH', '/api/v1/school', ['name' => 'Piraté'], $school)->assertForbidden();
    uploadLogo($school, pngUpload())->assertForbidden();

    // Direction d'un seul cycle : l'identité vaut pour toute l'école
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('PATCH', '/api/v1/school', ['name' => 'Piraté'], $school)->assertForbidden();
    spa('DELETE', '/api/v1/school/logo', [], $school)->assertForbidden();

    expect(ownerSchoolValue($school, 'name'))->not->toBe('Piraté');
});

it('isole l’identité des écoles (404, rien à deviner)', function (): void {
    $schoolA = makeSchool([], ['name' => 'École A']);
    $schoolB = makeSchool();
    actingAsRole(Role::Director, $schoolB);

    spa('GET', '/api/v1/school', [], $schoolA)->assertNotFound();
    spa('PATCH', '/api/v1/school', ['name' => 'Piraté'], $schoolA)->assertNotFound();

    // RLS : même en SQL brut, la direction de B ne modifie pas A
    inSchool($schoolB, static fn (): int => DB::update('update schools set name = ? where id = ?', ['Piraté', $schoolA->id]));
    expect(ownerSchoolValue($schoolA, 'name'))->toBe('École A');
});

it('enregistre le logo en WebP de 512 px au plus et le sert par une URL signée', function (): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    $response = uploadLogo($school, pngUpload(1200, 600))->assertOk();
    $url = $response->json('data.logo_url');
    \assert(is_string($url));

    $path = ownerSchoolValue($school, 'logo_path');
    \assert(is_string($path));
    expect($path)->toStartWith('school-logos/')->toEndWith('.webp')
        // Aucun identifiant d'école dans le chemin ni dans l'URL (affichée sur la page publique)
        ->and($url)->not->toContain($school->id);
    Storage::assertExists($path);
    $size = getimagesizefromstring((string) Storage::get($path));
    \assert($size !== false);
    expect([$size[0], $size[1], $size[2]])->toBe([512, 256, IMAGETYPE_WEBP]);

    // Lecture sans session, avec la signature
    $file = get(relativeUrl($url))->assertOk()->assertHeader('Content-Type', 'image/webp');
    expect($file->getContent())->toBe(Storage::get($path));

    // Signature modifiée ou expirée : refus
    get(relativeUrl($url).'x')->assertForbidden();
    Carbon::setTestNow(Carbon::now()->addMinutes(31));
    get(relativeUrl($url))->assertForbidden();
    Carbon::setTestNow();
});

it('remplace l’ancien logo, puis le retire', function (): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    uploadLogo($school, pngUpload())->assertOk();
    $first = ownerSchoolValue($school, 'logo_path');
    \assert(is_string($first));

    uploadLogo($school, pngUpload(300, 300))->assertOk();
    $second = ownerSchoolValue($school, 'logo_path');
    \assert(is_string($second));
    Storage::assertMissing($first);
    Storage::assertExists($second);

    spa('DELETE', '/api/v1/school/logo', [], $school)->assertOk()->assertJsonPath('data.logo_url', null);
    Storage::assertMissing($second);
    expect(ownerSchoolValue($school, 'logo_path'))->toBeNull();
});

it('refuse un fichier qui n’est pas une image valide', function (UploadedFile $file): void {
    $school = makeSchool();
    actingAsRole(Role::Director, $school);

    uploadLogo($school, $file)->assertUnprocessable()->assertJsonValidationErrors(['logo']);
    expect(ownerSchoolValue($school, 'logo_path'))->toBeNull();
})->with([
    'trop petite' => fn (): UploadedFile => pngUpload(32, 32),
    'pas une image' => fn (): UploadedFile => UploadedFile::fake()->createWithContent('logo.png', 'pas une image'),
    'SVG' => fn (): UploadedFile => UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>'),
    'trop lourde' => fn (): UploadedFile => UploadedFile::fake()->create('logo.png', 3000, 'image/png'),
]);

it('montre le logo et les coordonnées sur la page publique', function (): void {
    $school = makeSchool([], ['slug' => 'les-lauriers']);
    actingAsRole(Role::Director, $school);
    spa('PATCH', '/api/v1/school', ['address' => 'Cocody', 'phone' => '0722445566', 'motto' => 'Réussir'], $school)->assertOk();
    uploadLogo($school, pngUpload())->assertOk();

    $public = spa('GET', '/api/v1/public/schools/les-lauriers')->assertOk()
        ->assertJsonPath('data.address', 'Cocody')
        ->assertJsonPath('data.phone', '+2250722445566')
        ->assertJsonPath('data.motto', 'Réussir');
    $url = $public->json('data.logo_url');
    \assert(is_string($url));

    get(relativeUrl($url))->assertOk()->assertHeader('Content-Type', 'image/webp');
});
