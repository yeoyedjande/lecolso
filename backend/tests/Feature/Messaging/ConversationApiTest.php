<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Classroom;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\User;
use App\Domains\Messaging\Models\Message;
use App\Domains\Students\Models\Guardian;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Models\School;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * CE1 A tenue par une titulaire ; Awa (mère : +2250701020304, compte Parent) et Yao (père : +2250505050505, compte
 * Parent) ; une classe de MS sans titulaire avec Bintou (même mère).
 *
 * @return array{0: School, 1: Classroom, 2: User, 3: Student, 4: Student, 5: User, 6: User, 7: Student}
 */
function messagingSchool(): array
{
    $school = makeSchool(['kindergarten', 'primary']);
    $teacher = User::factory()->createOne(['name' => 'Aya Titulaire']);
    assignRole($teacher, $school, Role::Teacher, cycleOf($school, 'primary'));
    $classroom = classroomOf($school, 'CE1', 'A', ['homeroom_teacher_id' => $teacher->id]);
    $awa = enrollStudent($school, $classroom);
    $yao = enrollStudent($school, $classroom, ['first_name' => 'Yao', 'last_name' => 'Kouassi', 'gender' => 'M', 'guardian_phone' => '+2250505050505', 'guardian_name' => 'Paul Kouassi']);
    $bintou = enrollStudent($school, classroomOf($school, 'MS'), ['first_name' => 'Bintou']);
    $mother = User::factory()->createOne(['phone' => '+2250701020304', 'name' => 'Mariam Koné']);
    assignRole($mother, $school, Role::Guardian);
    $father = User::factory()->createOne(['phone' => '+2250505050505', 'name' => 'Paul Kouassi']);
    assignRole($father, $school, Role::Guardian);

    return [$school, $classroom, $teacher, $awa, $yao, $mother, $father, $bintou];
}

/**
 * @param  TestResponse<Response>  $response
 */
function conversationId(TestResponse $response): string
{
    $id = $response->json('data.conversation.id');

    return is_string($id) ? $id : throw new LogicException('Identifiant attendu.');
}

beforeEach(function (): void {
    Carbon::setTestNow('2026-10-05 08:00:00');
});

afterEach(function (): void {
    Carbon::setTestNow();
});

it('fait dialoguer un parent et la titulaire, avec les non-lus de chacun', function (): void {
    [$school, , $teacher, $awa, , $mother] = messagingSchool();

    login($mother);
    $created = spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'teacher', 'subject' => 'Cahier de lecture', 'body' => 'Bonjour, Awa a oublié son cahier.'], $school)
        ->assertSuccessful()
        ->assertJsonPath('data.conversation.channel', 'teacher')
        ->assertJsonPath('data.conversation.student.first_name', 'Awa')
        ->assertJsonPath('data.conversation.classroom.name', 'CE1 A')
        ->assertJsonPath('data.conversation.guardian.phone', null)
        ->assertJsonPath('data.conversation.side', 'guardian')
        ->assertJsonPath('data.conversation.unread', 0)
        ->assertJsonPath('data.messages.0.mine', true);
    $id = conversationId($created);

    Carbon::setTestNow('2026-10-05 08:05:00');
    login($teacher);
    spa('GET', '/api/v1/conversations/unread-count', [], $school)->assertOk()->assertJsonPath('data.count', 1);
    spa('GET', '/api/v1/conversations', [], $school)->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.unread', 1)
        ->assertJsonPath('data.0.side', 'school')
        ->assertJsonPath('data.0.can_write', true)
        ->assertJsonPath('data.0.guardian.phone', '+2250701020304')
        ->assertJsonPath('data.0.last_message.preview', 'Bonjour, Awa a oublié son cahier.');
    spa('POST', "/api/v1/conversations/{$id}/read", [], $school)->assertOk()->assertJsonPath('data.conversation.unread', 0);
    spa('POST', "/api/v1/conversations/{$id}/messages", ['body' => 'Merci, je le lui prête.'], $school)->assertOk()
        ->assertJsonCount(2, 'data.messages')
        ->assertJsonPath('data.messages.1.side', 'school')
        ->assertJsonPath('data.messages.1.author_name', 'Aya Titulaire');
    spa('GET', '/api/v1/conversations/unread-count', [], $school)->assertOk()->assertJsonPath('data.count', 0);

    Carbon::setTestNow('2026-10-05 08:10:00');
    login($mother);
    spa('GET', '/api/v1/conversations?unread=true', [], $school)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.unread', 1);

    // Un second message à la titulaire s'ajoute au même fil
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'teacher', 'subject' => 'Autre objet', 'body' => 'Et merci !'], $school)
        ->assertSuccessful()
        ->assertJsonPath('data.conversation.id', $id)
        ->assertJsonPath('data.conversation.subject', 'Cahier de lecture')
        ->assertJsonCount(3, 'data.messages');
});

it('sépare les fils « enseignant » et « administration » : la direction lit le premier sans y répondre', function (): void {
    [$school, , $teacher, $awa, , $mother] = messagingSchool();

    login($mother);
    $teacherThread = conversationId(spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'teacher', 'subject' => 'Devoirs', 'body' => 'Question sur les devoirs.'], $school)->assertSuccessful());
    $officeThread = conversationId(spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'office', 'subject' => 'Certificat', 'body' => 'Il me faut un certificat de scolarité.'], $school)->assertSuccessful());

    // La titulaire ne voit pas le fil de l'administration
    login($teacher);
    spa('GET', '/api/v1/conversations', [], $school)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $teacherThread);
    spa('GET', "/api/v1/conversations/{$officeThread}", [], $school)->assertNotFound();

    // Secrétariat du primaire : répond à l'administration, lit seulement le fil de la titulaire
    actingAsRole(Role::Secretary, $school, cycleOf($school, 'primary'));
    spa('GET', '/api/v1/conversations', [], $school)->assertOk()->assertJsonCount(2, 'data');
    spa('GET', "/api/v1/conversations/{$teacherThread}", [], $school)->assertOk()->assertJsonPath('data.conversation.can_write', false);
    spa('POST', "/api/v1/conversations/{$teacherThread}/messages", ['body' => 'Je réponds à sa place.'], $school)->assertForbidden();
    spa('POST', "/api/v1/conversations/{$officeThread}/messages", ['body' => 'Il est prêt au secrétariat.'], $school)->assertOk();

    // Direction de la maternelle : rien du primaire
    actingAsRole(Role::Director, $school, cycleOf($school, 'kindergarten'));
    spa('GET', '/api/v1/conversations', [], $school)->assertOk()->assertJsonCount(0, 'data');
    spa('GET', "/api/v1/conversations/{$officeThread}", [], $school)->assertNotFound();
    spa('POST', "/api/v1/conversations/{$officeThread}/messages", ['body' => 'Intrusion'], $school)->assertNotFound();
});

it('laisse l’école écrire à un tuteur de l’enfant, et refuse les écritures hors périmètre', function (): void {
    [$school, $classroom, $teacher, $awa, $yao, $mother, $father, $bintou] = messagingSchool();
    $awaMother = inSchool($school, static fn (): Guardian => Guardian::query()->where('phone', '+2250701020304')->firstOrFail());
    $yaoFather = inSchool($school, static fn (): Guardian => Guardian::query()->where('phone', '+2250505050505')->firstOrFail());

    // La titulaire écrit à la mère d'Awa
    login($teacher);
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'guardian_id' => $awaMother->id, 'channel' => 'teacher', 'subject' => 'Sortie au zoo', 'body' => 'Pensez à l’autorisation.'], $school)
        ->assertSuccessful()->assertJsonPath('data.conversation.side', 'school');
    // … mais pas au nom de l'administration, ni à un tuteur qui n'est pas celui de l'enfant
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'guardian_id' => $awaMother->id, 'channel' => 'office', 'subject' => 'Frais', 'body' => 'Rappel.'], $school)->assertForbidden();
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'guardian_id' => $yaoFather->id, 'channel' => 'teacher', 'subject' => 'Erreur', 'body' => 'Mauvais tuteur.'], $school)->assertNotFound();
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'teacher', 'subject' => 'Sans tuteur', 'body' => 'Qui ?'], $school)->assertNotFound();

    login($mother);
    spa('GET', '/api/v1/conversations', [], $school)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.unread', 1);

    // Le père de Yao n'écrit pas à propos d'Awa et ne lit pas son fil
    login($father);
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'teacher', 'subject' => 'Curieux', 'body' => 'Bonjour'], $school)->assertNotFound();
    spa('GET', '/api/v1/conversations', [], $school)->assertOk()->assertJsonCount(0, 'data');

    // Classe sans titulaire : écrire à l'administration
    login($mother);
    spa('POST', '/api/v1/conversations', ['student_id' => $bintou->id, 'channel' => 'teacher', 'subject' => 'Sieste', 'body' => 'Bintou dort mal.'], $school)
        ->assertStatus(409)->assertJsonPath('code', 'no_teacher');
    spa('POST', '/api/v1/conversations', ['student_id' => $bintou->id, 'channel' => 'office', 'subject' => 'Sieste', 'body' => 'Bintou dort mal.'], $school)->assertSuccessful();

    // Validation
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'teacher', 'subject' => 'Vide', 'body' => ''], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('body');
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'principal', 'subject' => 'Canal', 'body' => 'x'], $school)
        ->assertUnprocessable()->assertJsonValidationErrors('channel');
    expect($classroom->id)->not->toBe('')->and($yao->id)->not->toBe('');
});

it('garde les messages immuables pour la connexion applicative', function (): void {
    [$school, , , $awa, , $mother] = messagingSchool();
    login($mother);
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'teacher', 'subject' => 'Objet', 'body' => 'Texte'], $school)->assertSuccessful();

    // DB::table volontaire : vérifie le droit SQL lui-même (REVOKE UPDATE), sans passer par un modèle
    expect(static fn () => inSchool($school, static fn (): int => DB::table('messages')->update(['body' => 'Modifié'])))
        ->toThrow(QueryException::class);
    expect(inSchool($school, static fn (): int => Message::query()->count()))->toBe(1);
});

it('isole la messagerie entre établissements', function (): void {
    [$school, , , $awa, , $mother] = messagingSchool();
    login($mother);
    $id = conversationId(spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'channel' => 'teacher', 'subject' => 'Objet', 'body' => 'Texte'], $school)->assertSuccessful());

    $other = makeSchool(['primary']);
    $director = actingAsRole(Role::Director, $other);
    spa('GET', "/api/v1/conversations/{$id}", [], $other)->assertNotFound();
    spa('POST', "/api/v1/conversations/{$id}/messages", ['body' => 'Intrusion'], $other)->assertNotFound();
    spa('GET', '/api/v1/conversations', [], $other)->assertOk()->assertJsonCount(0, 'data');
    spa('POST', '/api/v1/conversations', ['student_id' => $awa->id, 'guardian_id' => $awa->id, 'channel' => 'office', 'subject' => 'Objet', 'body' => 'Texte'], $other)->assertNotFound();
    // Un compte sans affectation dans l'école visée : 404 dès l'en-tête
    spa('GET', '/api/v1/conversations', [], $school)->assertNotFound();
    expect($director->id)->not->toBe('');
});
