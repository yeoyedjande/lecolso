<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Domains\Students\Models\Guardian;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;
use Tests\Support\SpaClient;

use function Pest\Laravel\get;

beforeEach(function (): void {
    Storage::fake();
});

/** Photo envoyée par le navigateur (JPEG généré). */
function photoUpload(int $width = 1600, int $height = 1200, string $name = 'photo.jpg'): UploadedFile
{
    $image = imagecreatetruecolor(max(1, $width), max(1, $height));
    imagefill($image, 0, 0, (int) imagecolorallocate($image, 200, 120, 60));
    $path = tempnam(sys_get_temp_dir(), 'photo').'.jpg';
    imagejpeg($image, $path);

    return new UploadedFile($path, $name, 'image/jpeg', null, true);
}

/**
 * @return TestResponse<Response>
 */
function uploadPhoto(School $school, string $uri, UploadedFile $file): TestResponse
{
    return SpaClient::upload($uri, ['photo' => $file], ['X-School-Id' => $school->id]);
}

/** Chemin et paramètres d'une URL signée (appel direct de l'application). */
function signedPath(mixed $url): string
{
    \assert(is_string($url));
    $parts = parse_url($url);
    \assert(is_array($parts));

    return ($parts['path'] ?? '').'?'.($parts['query'] ?? '');
}

function ownerPhotoPath(string $table, string $id): ?string
{
    $path = DB::connection('pgsql_owner')->scalar("select photo_path from {$table} where id = ?", [$id]);

    return is_string($path) ? $path : null;
}

it('enregistre la photo de l’élève en WebP de 512 px et la sert 10 minutes par une URL signée', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    actingAsRole(Role::Secretary, $school);

    $response = uploadPhoto($school, '/api/v1/students/'.$student->id.'/photo', photoUpload())->assertOk();
    $path = ownerPhotoPath('students', $student->id);
    \assert($path !== null);
    expect($path)->toStartWith('person-photos/')->toEndWith('.webp');
    $size = getimagesizefromstring((string) Storage::get($path));
    \assert($size !== false);
    expect([$size[0], $size[1], $size[2]])->toBe([512, 384, IMAGETYPE_WEBP]);

    $url = $response->json('data.photo_url');
    get(signedPath($url))->assertOk()->assertHeader('Content-Type', 'image/webp')->assertHeader('Referrer-Policy', 'no-referrer');
    spa('GET', '/api/v1/students', [], $school)->assertJsonPath('data.0.photo_url', static fn (mixed $value): bool => is_string($value));

    get(signedPath($url).'x')->assertForbidden();
    Carbon::setTestNow(Carbon::now()->addMinutes(11));
    get(signedPath($url))->assertForbidden();
    Carbon::setTestNow();
});

it('remplace l’ancienne photo, puis la retire', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    actingAsRole(Role::Director, $school);
    $uri = '/api/v1/students/'.$student->id.'/photo';

    uploadPhoto($school, $uri, photoUpload())->assertOk();
    $first = ownerPhotoPath('students', $student->id);
    uploadPhoto($school, $uri, photoUpload(800, 800))->assertOk();
    $second = ownerPhotoPath('students', $student->id);
    \assert($first !== null && $second !== null);
    Storage::assertMissing($first);
    Storage::assertExists($second);

    spa('DELETE', $uri, [], $school)->assertOk()->assertJsonPath('data.photo_url', null);
    Storage::assertMissing($second);
    expect(ownerPhotoPath('students', $student->id))->toBeNull();
});

it('refuse un fichier qui n’est pas une photo valide', function (UploadedFile $file): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    actingAsRole(Role::Director, $school);

    uploadPhoto($school, '/api/v1/students/'.$student->id.'/photo', $file)
        ->assertUnprocessable()->assertJsonValidationErrors('photo');
    expect(Storage::allFiles())->toBe([]);
})->with([
    'texte' => [fn (): UploadedFile => UploadedFile::fake()->createWithContent('photo.jpg', 'pas une image')],
    'SVG' => [fn (): UploadedFile => UploadedFile::fake()->createWithContent('photo.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>')],
    'trop petite' => [fn (): UploadedFile => photoUpload(40, 40)],
    'trop lourde' => [fn (): UploadedFile => UploadedFile::fake()->image('photo.jpg', 2000, 2000)->size(6000)],
]);

it('photographie un tuteur, partagé par la fratrie', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $sibling = enrollStudent($school, classroomOf($school, 'CP1'), ['first_name' => 'Yao']);
    $guardian = inSchool($school, static fn (): Guardian => Guardian::query()->firstOrFail());
    actingAsRole(Role::Director, $school);
    $uri = '/api/v1/students/'.$student->id.'/guardians/'.$guardian->id.'/photo';

    uploadPhoto($school, $uri, photoUpload())->assertOk()
        ->assertJsonPath('data.guardians.0.photo_url', static fn (mixed $value): bool => is_string($value));
    spa('GET', '/api/v1/students/'.$sibling->id, [], $school)
        ->assertJsonPath('data.guardians.0.photo_url', static fn (mixed $value): bool => is_string($value));

    $path = ownerPhotoPath('guardians', $guardian->id);
    \assert($path !== null);
    spa('DELETE', $uri, [], $school)->assertOk()->assertJsonPath('data.guardians.0.photo_url', null);
    Storage::assertMissing($path);
});

it('efface la photo avec le dossier, et celle d’un tuteur qui n’a plus d’élève', function (): void {
    $school = makeSchool(['primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    actingAsRole(Role::Director, $school);

    spa('POST', '/api/v1/students/'.$student->id.'/guardians', ['name' => 'Ibrahim Koné', 'phone' => '0501020304', 'relation' => 'father'], $school)->assertOk();
    $father = inSchool($school, static fn (): Guardian => Guardian::query()->where('phone', '+2250501020304')->firstOrFail());
    uploadPhoto($school, '/api/v1/students/'.$student->id.'/guardians/'.$father->id.'/photo', photoUpload())->assertOk();
    $fatherPhoto = ownerPhotoPath('guardians', $father->id);
    spa('DELETE', '/api/v1/students/'.$student->id.'/guardians/'.$father->id, [], $school)->assertOk();
    \assert($fatherPhoto !== null);
    Storage::assertMissing($fatherPhoto);

    uploadPhoto($school, '/api/v1/students/'.$student->id.'/photo', photoUpload())->assertOk();
    $photo = ownerPhotoPath('students', $student->id);
    spa('DELETE', '/api/v1/students/'.$student->id, [], $school)->assertNoContent();
    \assert($photo !== null);
    Storage::assertMissing($photo);
    expect(ownerPhotoPath('students', $student->id))->toBeNull();
});

it('réserve la photo à qui gère l’élève et isole les écoles', function (): void {
    $school = makeSchool(['kindergarten', 'primary']);
    $student = enrollStudent($school, classroomOf($school, 'CE1'));
    $uri = '/api/v1/students/'.$student->id.'/photo';

    actingAsRole(Role::Accountant, $school);
    uploadPhoto($school, $uri, photoUpload())->assertForbidden();

    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    uploadPhoto($school, $uri, photoUpload())->assertNotFound();

    $other = makeSchool(['primary']);
    actingAsRole(Role::Director, $other);
    uploadPhoto($other, $uri, photoUpload())->assertNotFound();
    spa('DELETE', $uri, [], $other)->assertNotFound();

    expect(Storage::allFiles())->toBe([])
        ->and(inSchool($school, static fn (): ?string => Student::query()->first()?->photo_path))->toBeNull();
});

it('ne donne l’URL de la photo qu’à qui voit l’élève', function (): void {
    $school = makeSchool(['primary']);
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher);
    $mine = enrollStudent($school, classroomOf($school, 'CE1', 'A', ['homeroom_teacher_id' => $teacher->id]));
    $other = enrollStudent($school, classroomOf($school, 'CE2'), ['guardian_phone' => '+2250102030405']);
    actingAsRole(Role::Director, $school);
    uploadPhoto($school, '/api/v1/students/'.$mine->id.'/photo', photoUpload())->assertOk();
    uploadPhoto($school, '/api/v1/students/'.$other->id.'/photo', photoUpload())->assertOk();
    login($teacher)->assertOk();

    $list = spa('GET', '/api/v1/students', [], $school)->assertOk()->assertJsonCount(1, 'data');
    expect($list->json('data.0.photo_url'))->toBeString();
    spa('GET', '/api/v1/students/'.$other->id, [], $school)->assertNotFound();
});
