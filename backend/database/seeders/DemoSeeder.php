<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Academic\Actions\ProvisionCycles;
use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Models\Level;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\SchoolRole;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Enums\SchoolType;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\Platform;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * Données de démo (local et staging) : 2 écoles, un compte par rôle. Comptes et mot de passe dans le README.
 *
 * - Jamais en production : refus explicite avant toute écriture.
 * - Écriture par la connexion super-admin (Platform::run), school_id explicites : aucun contournement de la RLS
 *   dans le code applicatif.
 * - Idempotent : écoles retrouvées par slug, comptes par téléphone.
 */
final class DemoSeeder extends Seeder
{
    public const string PASSWORD = 'Demo2026!';

    /** @var array<string, array{name: string, cycles: list<string>, address: string, phone: string, email: string, motto: string}> */
    public const array SCHOOLS = [
        'les-lauriers' => [
            'name' => 'Les Lauriers',
            'cycles' => ['daycare', 'kindergarten', 'primary'],
            'address' => 'Cocody Angré, 8e tranche, Abidjan',
            'phone' => '+2252722410000',
            'email' => 'contact@leslauriers.ci',
            'motto' => 'Grandir, apprendre, s’épanouir',
        ],
        'petits-genies' => [
            'name' => 'Petits Génies',
            'cycles' => ['daycare', 'kindergarten'],
            'address' => 'Riviera Palmeraie, Abidjan',
            'phone' => '+2252722550000',
            'email' => 'bonjour@petitsgenies.ci',
            'motto' => 'Chaque enfant est un génie',
        ],
    ];

    /**
     * Téléphone => compte et affectations (école, rôle, cycle éventuel).
     *
     * @var array<string, array{name: string, email: string, super_admin?: bool, roles: list<array{school: string, role: Role, cycle?: string}>}>
     */
    public const array ACCOUNTS = [
        '+2250700000001' => ['name' => 'Super-admin Démo', 'email' => 'superadmin@demo.ekalewa.com', 'super_admin' => true, 'roles' => []],
        '+2250700000002' => ['name' => 'Konan Promoteur', 'email' => 'promoteur@demo.ekalewa.com', 'roles' => [
            ['school' => 'les-lauriers', 'role' => Role::Promoter],
            ['school' => 'petits-genies', 'role' => Role::Promoter],
        ]],
        '+2250700000003' => ['name' => 'Yao Directeur', 'email' => 'directeur@demo.ekalewa.com', 'roles' => [
            ['school' => 'les-lauriers', 'role' => Role::Director],
        ]],
        '+2250700000004' => ['name' => 'Aminata Directrice maternelle', 'email' => 'directrice.maternelle@demo.ekalewa.com', 'roles' => [
            ['school' => 'les-lauriers', 'role' => Role::Director, 'cycle' => 'kindergarten'],
        ]],
        '+2250700000005' => ['name' => 'Awa Secrétaire', 'email' => 'secretaire@demo.ekalewa.com', 'roles' => [
            ['school' => 'les-lauriers', 'role' => Role::Secretary],
        ]],
        '+2250700000006' => ['name' => 'Moussa Comptable', 'email' => 'comptable@demo.ekalewa.com', 'roles' => [
            ['school' => 'les-lauriers', 'role' => Role::Accountant],
        ]],
        '+2250700000007' => ['name' => 'Fatou Enseignante', 'email' => 'enseignante@demo.ekalewa.com', 'roles' => [
            ['school' => 'les-lauriers', 'role' => Role::Teacher, 'cycle' => 'primary'],
        ]],
        '+2250700000008' => ['name' => 'Kouadio Parent', 'email' => 'parent@demo.ekalewa.com', 'roles' => [
            ['school' => 'les-lauriers', 'role' => Role::Guardian],
            ['school' => 'petits-genies', 'role' => Role::Guardian],
        ]],
        '+2250700000009' => ['name' => 'Mariam Directrice', 'email' => 'directrice@demo.ekalewa.com', 'roles' => [
            ['school' => 'petits-genies', 'role' => Role::Director],
        ]],
    ];

    /**
     * Rôles personnalisés de démonstration (école => nom, description, permissions), non attribués.
     *
     * @var array<string, list<array{name: string, description: string, permissions: list<string>}>>
     */
    public const array CUSTOM_ROLES = [
        'les-lauriers' => [[
            'name' => 'Surveillant général',
            'description' => 'Présences, retards et suivi des élèves',
            'permissions' => ['students.view', 'attendance.view', 'attendance.manage', 'messaging.send'],
        ]],
    ];

    /**
     * Classes de l'année 2026-2027 (mêmes que la démonstration du frontend) : niveau => sections.
     *
     * @var array<string, array<string, list<string>>>
     */
    public const array CLASSROOMS = [
        'les-lauriers' => [
            'CRECHE' => ['A'], 'PS' => ['A'], 'MS' => ['A'], 'GS' => ['A'], 'CP1' => ['A'], 'CP2' => ['A'],
            'CE1' => ['A', 'B'], 'CE2' => ['A'], 'CM1' => ['A'], 'CM2' => ['A'],
        ],
        'petits-genies' => ['CRECHE' => ['A', 'B'], 'PS' => ['A', 'B'], 'MS' => ['A'], 'GS' => ['A']],
    ];

    /** Classes dont l'enseignante de démonstration est titulaire (école => noms « NIVEAU SECTION »). */
    public const array HOMEROOM = ['les-lauriers' => ['CE1 A', 'CM1 A']];

    public const string TEACHER_PHONE = '+2250700000007';

    public function run(Application $app, ProvisionCycles $provisionCycles): void
    {
        if ($app->environment('production')) {
            throw new RuntimeException('Les données de démo ne peuvent pas être créées en production.');
        }

        Platform::run(function () use ($provisionCycles): void {
            $schools = [];
            foreach (self::SCHOOLS as $slug => $definition) {
                $schools[$slug] = $this->school($slug, $definition);
                $provisionCycles->handle($schools[$slug], $definition['cycles']);
            }

            foreach (self::CUSTOM_ROLES as $slug => $roles) {
                foreach ($roles as $role) {
                    $this->customRole($schools[$slug], $role['name'], $role['description'], $role['permissions']);
                }
            }

            foreach (self::ACCOUNTS as $phone => $account) {
                $user = $this->user($phone, $account['name'], $account['email'], $account['super_admin'] ?? false);

                foreach ($account['roles'] as $assignment) {
                    $school = $schools[$assignment['school']];
                    $this->assign($user, $school, $assignment['role'], $assignment['cycle'] ?? null);
                }
            }

            $teacher = User::query()->where('phone', self::TEACHER_PHONE)->firstOrFail();
            foreach ($schools as $slug => $school) {
                $year = $this->academicYear($school);
                foreach (self::CLASSROOMS[$slug] as $levelCode => $sections) {
                    foreach ($sections as $section) {
                        $homeroom = in_array($levelCode.' '.$section, self::HOMEROOM[$slug] ?? [], true) ? $teacher->id : null;
                        $this->classroom($school, $year, $levelCode, $section, $homeroom);
                    }
                }
            }
        });
    }

    private function academicYear(School $school): AcademicYear
    {
        $year = AcademicYear::query()->where('school_id', $school->id)->where('label', '2026-2027')->first() ?? new AcademicYear;
        $year->forceFill([
            'school_id' => $school->id,
            'label' => '2026-2027',
            'starts_on' => '2026-09-14',
            'ends_on' => '2027-07-02',
            'status' => AcademicYearStatus::Open,
            'is_current' => true,
        ])->save();

        return $year;
    }

    private function classroom(School $school, AcademicYear $year, string $levelCode, string $section, ?string $teacherId): void
    {
        $level = Level::query()->where('school_id', $school->id)->where('code', $levelCode)->firstOrFail();
        $classroom = Classroom::query()
            ->where('school_id', $school->id)
            ->where('academic_year_id', $year->id)
            ->where('level_id', $level->id)
            ->where('section', $section)
            ->first() ?? new Classroom;

        $classroom->forceFill([
            'school_id' => $school->id,
            'academic_year_id' => $year->id,
            'level_id' => $level->id,
            'section' => $section,
            'capacity' => 30,
            'room' => 'Salle '.$levelCode.' '.$section,
            'homeroom_teacher_id' => $teacherId,
        ])->save();
    }

    /**
     * @param  array{name: string, address: string, phone: string, email: string, motto: string}  $definition
     */
    private function school(string $slug, array $definition): School
    {
        $school = School::query()->where('slug', $slug)->first() ?? new School;
        $school->forceFill([
            'name' => $definition['name'],
            'slug' => $slug,
            'type' => SchoolType::PreschoolPrimary,
            'city' => 'Abidjan',
            'address' => $definition['address'],
            'phone' => $definition['phone'],
            'email' => $definition['email'],
            'motto' => $definition['motto'],
            'currency' => 'XOF',
        ])->save();

        return $school;
    }

    /**
     * @param  list<string>  $permissions
     */
    private function customRole(School $school, string $name, string $description, array $permissions): void
    {
        $role = SchoolRole::query()
            ->where('school_id', $school->id)
            ->whereNull('system_key')
            ->whereRaw('lower(name) = lower(?)', [$name])
            ->first() ?? new SchoolRole;

        $role->forceFill([
            'school_id' => $school->id,
            'name' => $name,
            'description' => $description,
            'permissions' => $permissions,
        ])->save();
    }

    private function user(string $phone, string $name, string $email, bool $superAdmin): User
    {
        $user = User::query()->where('phone', $phone)->first() ?? new User;
        $user->forceFill([
            'name' => $name,
            'phone' => $phone,
            'email' => $email,
            'password' => self::PASSWORD,
            'must_change_password' => false,
            'is_super_admin' => $superAdmin,
        ])->save();

        return $user;
    }

    private function assign(User $user, School $school, Role $role, ?string $cycleCode): void
    {
        $cycleId = $cycleCode === null ? null : Cycle::query()
            ->where('school_id', $school->id)
            ->where('code', $cycleCode)
            ->firstOrFail()
            ->id;

        $exists = RoleAssignment::query()
            ->where('school_id', $school->id)
            ->where('user_id', $user->id)
            ->where('role', $role->value)
            ->where('cycle_id', $cycleId)
            ->exists();

        if (! $exists) {
            (new RoleAssignment)->forceFill([
                'school_id' => $school->id,
                'user_id' => $user->id,
                'role' => $role,
                'cycle_id' => $cycleId,
            ])->save();
        }
    }
}
