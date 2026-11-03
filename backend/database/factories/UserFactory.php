<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Domains\Identity\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * Mot de passe de test : « password ». Téléphone ivoirien E.164 unique.
 *
 * @extends Factory<User>
 */
final class UserFactory extends Factory
{
    protected $model = User::class;

    private static ?string $password = null;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone' => '+22507'.fake()->unique()->numerify('########'),
            'email' => fake()->unique()->safeEmail(),
            'password' => self::$password ??= Hash::make('password'),
        ];
    }

    /** Compte créé par le personnel : mot de passe provisoire à changer à la première connexion. */
    public function withProvisionalPassword(): self
    {
        return $this->afterMaking(static function (User $user): void {
            $user->forceFill(['must_change_password' => true]);
        });
    }

    public function withoutEmail(): self
    {
        return $this->state(['email' => null]);
    }
}
