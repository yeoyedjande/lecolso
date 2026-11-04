<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Actions;

use App\Domains\Academic\Actions\ProvisionCycles;
use App\Domains\Identity\Actions\ResetUserPassword;
use App\Domains\Identity\Enums\Role;
use App\Domains\Identity\Models\RoleAssignment;
use App\Domains\Identity\Models\User;
use App\Domains\Tenancy\Data\CreatedSchool;
use App\Domains\Tenancy\Data\NewSchool;
use App\Domains\Tenancy\Models\School;
use App\Support\Tenancy\Platform;
use Illuminate\Validation\ValidationException;

/**
 * Super-admin : crée une école, ouvre ses cycles (catalogue) et rattache son directeur, en une seule transaction
 * sur la connexion app_platform. Le directeur reçoit un mot de passe provisoire s'il n'avait pas de compte.
 */
final readonly class CreateSchool
{
    public function __construct(private ProvisionCycles $provisionCycles) {}

    /**
     * @throws ValidationException slug déjà utilisé (vérifié hors RLS : toutes les écoles de la plateforme)
     *                             ou e-mail du nouveau directeur déjà pris par un autre compte
     */
    public function handle(NewSchool $data): CreatedSchool
    {
        return Platform::run(function () use ($data): CreatedSchool {
            if (School::withTrashed()->where('slug', $data->slug)->exists()) {
                throw ValidationException::withMessages(['slug' => 'Cette adresse est déjà utilisée par une autre école.']);
            }

            $school = new School;
            $school->forceFill([
                'name' => $data->name,
                'slug' => $data->slug,
                'city' => $data->city,
                'type' => $data->type,
                'currency' => 'XOF',
            ])->save();

            $this->provisionCycles->handle($school, $data->cycles);

            $provisional = null;
            $director = User::query()->where('phone', $data->directorPhone)->first();
            if ($director === null) {
                // L'e-mail est unique : un compte existant porte déjà cette adresse (insensible à la casse)
                if ($data->directorEmail !== null
                    && User::query()->whereRaw('lower(email) = ?', [mb_strtolower($data->directorEmail)])->exists()) {
                    throw ValidationException::withMessages(['director.email' => 'Cette adresse e-mail est déjà utilisée par un autre compte.']);
                }

                $provisional = ResetUserPassword::generate();
                $director = new User;
                $director->forceFill([
                    'name' => $data->directorName,
                    'phone' => $data->directorPhone,
                    'email' => $data->directorEmail,
                    'password' => $provisional,
                    'must_change_password' => true,
                ])->save();
            }

            (new RoleAssignment)->forceFill([
                'school_id' => $school->id,
                'user_id' => $director->id,
                'role' => Role::Director,
                'cycle_id' => null,
            ])->save();

            return new CreatedSchool($school->refresh(), $director, $provisional);
        });
    }
}
