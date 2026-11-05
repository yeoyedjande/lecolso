<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Domains\Academic\Actions\ProvisionCycles;
use App\Domains\Academic\Enums\AcademicYearStatus;
use App\Domains\Academic\Models\AcademicYear;
use App\Domains\Academic\Models\Classroom;
use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Models\Level;
use App\Domains\Billing\Actions\CreateInvoice;
use App\Domains\Billing\Actions\ManageInvoiceLines;
use App\Domains\Billing\Actions\ProvisionFeeTypes;
use App\Domains\Billing\Enums\LineKind;
use App\Domains\Billing\Models\FeeSchedule;
use App\Domains\Billing\Models\FeeType;
use App\Domains\Billing\Models\InvoiceLine;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\SchoolRole;
use App\Domains\Identity\Models\User;
use App\Domains\Students\Enums\EnrollmentStatus;
use App\Domains\Students\Enums\Gender;
use App\Domains\Students\Enums\GuardianRelation;
use App\Domains\Students\Models\Enrollment;
use App\Domains\Students\Models\Guardian;
use App\Domains\Students\Models\GuardianLink;
use App\Domains\Students\Models\Student;
use App\Domains\Tenancy\Enums\SchoolType;
use App\Domains\Tenancy\Models\School;
use App\Support\Sequences\Sequence;
use App\Support\Tenancy\Platform;
use App\Support\Tenancy\TenantContext;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
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

    /** Préfixe des matricules de chaque école. */
    public const array CODES = ['les-lauriers' => 'LAU', 'petits-genies' => 'PGE'];

    /** Élèves par classe (prénoms et noms tirés en boucle des listes ci-dessous, ordre fixe). */
    public const array STUDENTS_PER_CLASSROOM = ['les-lauriers' => 3, 'petits-genies' => 2];

    /** Enfants du compte parent de démo (téléphone du compte = tuteur) : école => [classe, prénom, sexe]. */
    public const array GUARDIAN_CHILDREN = [
        'les-lauriers' => [['CE1 A', 'Ange', 'M'], ['CP1 A', 'Junior', 'M']],
        'petits-genies' => [['MS A', 'Grâce', 'F']],
    ];

    public const string GUARDIAN_PHONE = '+2250700000008';

    /** Scolarité annuelle par cycle (FCFA), majorée pour les grandes classes du primaire. */
    public const array TUITION = ['daycare' => 360000, 'kindergarten' => 300000, 'primary' => 270000];

    public const array TUITION_BONUS = ['CE1' => 10000, 'CE2' => 10000, 'CM1' => 20000, 'CM2' => 30000];

    private const array FIRST_NAMES = [
        'F' => ['Awa', 'Aïcha', 'Mariam', 'Fatou', 'Adjoua', 'Aya', 'Inès', 'Grâce', 'Salimata', 'Emmanuella', 'Rokia', 'Esther'],
        'M' => ['Yao', 'Koffi', 'Ibrahim', 'Moussa', 'Kouamé', 'Didier', 'Serge', 'Ismaël', 'Jean-Marc', 'Souleymane', 'Arnaud', 'Wilfried'],
    ];

    private const array LAST_NAMES = ['Koné', 'Traoré', 'Bamba', 'Kouassi', 'Ouattara', 'Yao', 'Diallo', 'Coulibaly', 'N’Guessan', 'Touré', 'Kouadio', 'Konan', 'Soro', 'Aka', 'Dembélé'];

    /** Âge de l'élève : 2 ans en crèche, puis un an de plus par niveau. */
    private const array LEVEL_ORDER = ['CRECHE', 'PS', 'MS', 'GS', 'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];

    private const array MOTHER_NAMES = ['Mariam', 'Adjoua', 'Fatoumata', 'Aminata', 'Brigitte', 'Rachel', 'Nadège', 'Clarisse'];

    private const array FATHER_NAMES = ['Ibrahim', 'Kouassi', 'Lassina', 'Hervé', 'Patrice', 'Seydou', 'Paul', 'Mamadou'];

    public function run(Application $app, ProvisionCycles $provisionCycles, ProvisionFeeTypes $provisionFeeTypes): void
    {
        if ($app->environment('production')) {
            throw new RuntimeException('Les données de démo ne peuvent pas être créées en production.');
        }

        Platform::run(function () use ($provisionCycles, $provisionFeeTypes): void {
            $schools = [];
            foreach (self::SCHOOLS as $slug => $definition) {
                $schools[$slug] = $this->school($slug, $definition);
                $provisionCycles->handle($schools[$slug], $definition['cycles']);
                $provisionFeeTypes->handle($schools[$slug]);
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
                $this->students($school, $year, $slug);
                $this->billing($school, $year, $slug);
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

    /**
     * Élèves de démonstration, inscrits dans chaque classe de l'année : une mère (payeuse, contact principal) et,
     * un élève sur deux, un père ; enfants du compte parent de démo ; quelques allergies. Matricules et compteur
     * de l'école alignés (les inscriptions suivantes continuent la numérotation).
     */
    private function students(School $school, AcademicYear $year, string $slug): void
    {
        $classrooms = Classroom::query()->where('school_id', $school->id)->where('academic_year_id', $year->id)
            ->with('level.cycle')->get()
            ->sortBy([
                static fn (Classroom $a, Classroom $b): int => [$a->level->cycle->position, $a->level->position, $a->section] <=> [$b->level->cycle->position, $b->level->position, $b->section],
            ]);
        $schoolIndex = array_search($slug, array_keys(self::SCHOOLS), true);
        $number = 0;

        foreach ($classrooms as $classroom) {
            $children = array_values(array_filter(
                self::GUARDIAN_CHILDREN[$slug] ?? [],
                static fn (array $child): bool => $child[0] === $classroom->name(),
            ));

            for ($i = 0; $i < self::STUDENTS_PER_CLASSROOM[$slug] + count($children); $i++) {
                $number++;
                $child = $children[$i - self::STUDENTS_PER_CLASSROOM[$slug]] ?? null;
                $gender = $child === null ? ($number % 2 === 0 ? 'M' : 'F') : $child[2];
                $lastName = $child === null ? self::LAST_NAMES[($number * 7) % count(self::LAST_NAMES)] : 'Kouadio';
                $firstName = $child[1] ?? self::FIRST_NAMES[$gender][$number % count(self::FIRST_NAMES[$gender])];
                $rank = array_search($classroom->level->code, self::LEVEL_ORDER, true);
                $age = 2 + ($rank === false ? 4 : $rank);

                $student = $this->student($school, sprintf('%s-%06d', self::CODES[$slug], $number), [
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'gender' => Gender::from($gender),
                    'birth_date' => sprintf('%d-%02d-%02d', 2026 - $age, 1 + $number % 12, 1 + ($number * 3) % 28),
                    'address' => $number % 3 === 0 ? 'Cocody Angré' : ($number % 3 === 1 ? 'Riviera 2' : 'Marcory Zone 4'),
                    'allergies' => $number % 9 === 4 ? 'Arachide' : null,
                ]);

                $phone = sprintf('+2250710%06d', ($schoolIndex === false ? 0 : $schoolIndex) * 1000 + $number);
                $mother = $child === null
                    ? $this->guardian($school, $phone, self::MOTHER_NAMES[$number % count(self::MOTHER_NAMES)].' '.$lastName, 'Commerçante')
                    : $this->guardian($school, self::GUARDIAN_PHONE, 'Kouadio Parent', 'Enseignant');
                $this->link($school, $mother, $student, $child === null ? GuardianRelation::Mother : GuardianRelation::Father, true);

                if ($child === null && $number % 2 === 0) {
                    $father = $this->guardian($school, sprintf('+2250510%06d', ($schoolIndex === false ? 0 : $schoolIndex) * 1000 + $number), self::FATHER_NAMES[$number % count(self::FATHER_NAMES)].' '.$lastName, 'Fonctionnaire');
                    $this->link($school, $father, $student, GuardianRelation::Father, false);
                }

                $enrollment = Enrollment::query()->where('student_id', $student->id)->where('academic_year_id', $year->id)->first() ?? new Enrollment;
                $enrollment->forceFill([
                    'school_id' => $school->id,
                    'student_id' => $student->id,
                    'academic_year_id' => $year->id,
                    'classroom_id' => $classroom->id,
                    'status' => EnrollmentStatus::Active,
                    'enrolled_on' => '2026-09-14',
                ])->save();
            }
        }

        // Le compteur reprend après le dernier matricule de démonstration (jamais en arrière)
        DB::table('document_sequences')->upsert(
            [['id' => (string) Str::uuid(), 'school_id' => $school->id, 'key' => Sequence::STUDENT_MATRICULE, 'last_value' => $number, 'created_at' => now(), 'updated_at' => now()]],
            ['school_id', 'key'],
            ['last_value' => DB::raw('greatest(document_sequences.last_value, excluded.last_value)'), 'updated_at' => now()],
        );
    }

    /**
     * Grille de frais de l'année (mêmes montants que la démonstration du frontend) et factures de tous les élèves :
     * un élève sur trois prend la cantine, un sur cinq le transport ; le fils aîné du compte parent a une remise
     * (fratrie). Idempotent : une inscription facturée garde sa facture, la remise n'est ajoutée qu'une fois.
     */
    private function billing(School $school, AcademicYear $year, string $slug): void
    {
        $context = app(TenantContext::class);
        $context->run($school, function () use ($school, $year, $slug): void {
            $types = FeeType::query()->where('school_id', $school->id)->get()->keyBy('code');
            $levels = Level::query()->where('school_id', $school->id)->with('cycle')->get();

            foreach ($levels as $level) {
                $cycle = $level->cycle->code;
                $amounts = [
                    'registration' => $cycle === 'daycare' ? 20000 : 25000,
                    'tuition' => (self::TUITION[$cycle] ?? 270000) + (self::TUITION_BONUS[$level->code] ?? 0),
                    'canteen' => 90000,
                    'transport' => 120000,
                    'daycare' => $cycle === 'daycare' ? 0 : 60000,
                ];
                foreach ($amounts as $code => $amount) {
                    $type = $types->get($code);
                    if (! $type instanceof FeeType || $amount === 0) {
                        continue;
                    }
                    FeeSchedule::query()->updateOrCreate(
                        ['school_id' => $school->id, 'academic_year_id' => $year->id, 'level_id' => $level->id, 'fee_type_id' => $type->id],
                        ['amount' => $amount],
                    );
                }
            }

            $create = app(CreateInvoice::class);
            $enrollments = Enrollment::query()->where('school_id', $school->id)->where('academic_year_id', $year->id)
                ->with(['student', 'classroom.level.cycle', 'academicYear'])->get()
                ->sortBy(static fn (Enrollment $enrollment): string => $enrollment->student->matricule);
            foreach ($enrollments->values() as $index => $enrollment) {
                $options = array_values(array_filter([
                    $index % 3 === 0 ? 'canteen' : null,
                    $index % 5 === 0 ? 'transport' : null,
                ]));
                $invoice = $create->handle($enrollment, $options);
                if ($invoice === null) {
                    continue;
                }

                $isElder = $enrollment->student->first_name === 'Ange' && $slug === 'les-lauriers';
                $hasDiscount = InvoiceLine::query()->where('invoice_id', $invoice->id)->where('kind', LineKind::Discount)->exists();
                $director = User::query()->where('phone', '+2250700000003')->first();
                if ($isElder && ! $hasDiscount && $director instanceof User) {
                    app(ManageInvoiceLines::class)->addDiscount($invoice, $director, 30000, 'Fratrie : deux enfants inscrits');
                }
            }
        });
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function student(School $school, string $matricule, array $attributes): Student
    {
        $student = Student::withTrashed()->where('school_id', $school->id)->where('matricule', $matricule)->first() ?? new Student;
        $student->forceFill(['school_id' => $school->id, 'matricule' => $matricule, 'deleted_at' => null, ...$attributes])->save();

        return $student;
    }

    private function guardian(School $school, string $phone, string $name, string $profession): Guardian
    {
        $guardian = Guardian::query()->where('school_id', $school->id)->where('phone', $phone)->first() ?? new Guardian;
        $guardian->forceFill(['school_id' => $school->id, 'phone' => $phone, 'name' => $name, 'profession' => $profession])->save();

        return $guardian;
    }

    private function link(School $school, Guardian $guardian, Student $student, GuardianRelation $relation, bool $main): void
    {
        $link = GuardianLink::query()->where('student_id', $student->id)->where('guardian_id', $guardian->id)->first() ?? new GuardianLink;
        $link->forceFill([
            'school_id' => $school->id,
            'guardian_id' => $guardian->id,
            'student_id' => $student->id,
            'relation' => $relation,
            'is_primary_contact' => $main,
            'is_payer' => $main,
            'can_pick_up' => true,
        ])->save();
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
            'code' => self::CODES[$slug] ?? 'ECO',
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
