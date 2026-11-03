<?php

declare(strict_types=1);

use App\Domains\Identity\Enums\Role;
use App\Support\Audit\SensitiveAttributes;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * Entrées du journal lues par le rôle propriétaire (hors RLS), pour vérifier ce qui a été écrit.
 *
 * @return list<array{school_id: mixed, subject_id: mixed, causer_id: mixed, event: mixed, properties: array<array-key, mixed>}>
 */
function auditRows(?string $subjectId = null): array
{
    $sql = 'select school_id, subject_id, causer_id, event, properties::text as properties from activity_log';
    $rows = $subjectId === null
        ? DB::connection('pgsql_owner')->select($sql.' order by created_at')
        : DB::connection('pgsql_owner')->select($sql.' where subject_id = ? order by created_at', [$subjectId]);

    $entries = [];
    foreach ($rows as $row) {
        $row = (array) $row;
        $properties = is_string($row['properties'] ?? null) ? json_decode($row['properties'], true) : null;

        $entries[] = [
            'school_id' => $row['school_id'] ?? null,
            'subject_id' => $row['subject_id'] ?? null,
            'causer_id' => $row['causer_id'] ?? null,
            'event' => $row['event'] ?? null,
            'properties' => is_array($properties) ? $properties : [],
        ];
    }

    return $entries;
}

/**
 * Toutes les clés d'un tableau, à tous les niveaux.
 *
 * @param  array<array-key, mixed>  $values
 * @return list<array-key>
 */
function allKeys(array $values): array
{
    $keys = [];
    foreach ($values as $key => $value) {
        $keys[] = $key;
        if (is_array($value)) {
            $keys = [...$keys, ...allKeys($value)];
        }
    }

    return $keys;
}

it('journalise une modification avec l’école, l’auteur et les valeurs avant/après', function (): void {
    $school = makeSchool(['primary']);
    $primary = cycleOf($school, 'primary');
    $director = actingAsRole(Role::Director, $school);

    spa('PATCH', "/api/v1/cycles/{$primary->id}", ['name' => 'Primaire bilingue'], $school)->assertOk();

    $updates = array_values(array_filter(auditRows($primary->id), static fn (array $row): bool => $row['event'] === 'updated'));

    expect($updates)->toHaveCount(1)
        ->and($updates[0]['school_id'])->toBe($school->id)
        ->and($updates[0]['causer_id'])->toBe($director->id);

    expect($updates[0]['properties'])->toMatchArray([
        'attributes' => ['name' => 'Primaire bilingue'],
        'old' => ['name' => 'Primaire'],
    ]);
});

it('ne journalise jamais le mot de passe ni le jeton « se souvenir de moi »', function (): void {
    $school = makeSchool();
    $teacher = makeUser();
    assignRole($teacher, $school, Role::Teacher);
    actingAsRole(Role::Director, $school);

    spa('POST', "/api/v1/users/{$teacher->id}/password-reset", [], $school)->assertOk();

    $rows = auditRows($teacher->id);
    expect($rows)->not->toBeEmpty();

    $loggedKeys = [];
    foreach ($rows as $row) {
        expect($row['school_id'])->toBe($school->id)
            ->and(allKeys($row['properties']))->not->toContain('password')
            ->and(allKeys($row['properties']))->not->toContain('remember_token');
        $loggedKeys = [...$loggedKeys, ...allKeys($row['properties'])];
    }

    // La réinitialisation reste tracée : le passage à « mot de passe provisoire » est visible
    expect($loggedKeys)->toContain('must_change_password');
});

it('retire les informations médicales et les secrets avant l’écriture (second filet)', function (): void {
    $school = makeSchool(['primary']);

    inSchool($school, static function () use ($school): void {
        activity('audit')
            ->performedOn(cycleOf($school, 'primary'))
            ->withProperties(['attributes' => [
                'name' => 'Aya',
                'medical_notes' => 'asthme',
                'health_insurance' => 'X',
                'allergies' => 'arachide',
                'password' => 'secret',
                'nested' => ['blood_type' => 'O+', 'kept' => 'oui'],
            ]])
            ->log('test');
    });

    $rows = auditRows();
    $last = end($rows);

    expect($last === false ? null : $last['properties'])->toBe(['attributes' => ['name' => 'Aya', 'nested' => ['kept' => 'oui']]]);
});

it('reconnaît les attributs sensibles', function (string $attribute, bool $sensitive): void {
    expect(SensitiveAttributes::isSensitive($attribute))->toBe($sensitive);
})->with([
    ['password', true],
    ['remember_token', true],
    ['medical_info', true],
    ['MEDICAL_NOTES', true],
    ['health_status', true],
    ['allergies', true],
    ['name', false],
    ['phone', false],
]);

it('n’écrit rien quand aucune école n’est déterminable', function (): void {
    $user = makeUser();
    assignRole($user, makeSchool(), Role::Teacher);
    login($user)->assertOk();
    $before = count(auditRows($user->id));

    // Changement de son propre mot de passe, hors de toute école
    spa('POST', '/api/v1/auth/password', [
        'current_password' => 'password',
        'password' => 'nouveau-secret',
        'password_confirmation' => 'nouveau-secret',
    ])->assertNoContent();

    expect(auditRows($user->id))->toHaveCount($before);
});

it('isole le journal entre écoles (RLS)', function (): void {
    $schoolA = makeSchool(['primary']);
    $schoolB = makeSchool(['primary']);

    expect(DB::scalar('select count(*) from activity_log'))->toBe(0)
        ->and(inSchool($schoolA, static fn (): array => distinctColumn('school_id', 'select school_id from activity_log')))
        ->toBe([$schoolA->id])
        ->and(inSchool($schoolB, static fn (): array => distinctColumn('school_id', 'select school_id from activity_log')))
        ->toBe([$schoolB->id]);

    // Écrire dans le journal d'une autre école est refusé
    inSchool($schoolA, static function () use ($schoolB): void {
        expect(static fn () => DB::insert(
            "insert into activity_log (id, school_id, description) values (gen_random_uuid(), ?, 'faux')",
            [$schoolB->id],
        ))->toThrow(QueryException::class, 'row-level security');
    });
});
