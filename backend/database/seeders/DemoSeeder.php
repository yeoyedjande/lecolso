<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Academic\Actions\ProvisionCycles;
use App\Domains\Academic\Models\Cycle;
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

    /** @var array<string, array{name: string, cycles: list<string>}> */
    public const array SCHOOLS = [
        'les-lauriers' => ['name' => 'Les Lauriers', 'cycles' => ['daycare', 'kindergarten', 'primary']],
        'petits-genies' => ['name' => 'Petits Génies', 'cycles' => ['daycare', 'kindergarten']],
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

    public function run(Application $app, ProvisionCycles $provisionCycles): void
    {
        if ($app->environment('production')) {
            throw new RuntimeException('Les données de démo ne peuvent pas être créées en production.');
        }

        Platform::run(function () use ($provisionCycles): void {
            $schools = [];
            foreach (self::SCHOOLS as $slug => $definition) {
                $schools[$slug] = $this->school($slug, $definition['name']);
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
        });
    }

    private function school(string $slug, string $name): School
    {
        $school = School::query()->where('slug', $slug)->first() ?? new School;
        $school->forceFill([
            'name' => $name,
            'slug' => $slug,
            'type' => SchoolType::PreschoolPrimary,
            'city' => 'Abidjan',
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
