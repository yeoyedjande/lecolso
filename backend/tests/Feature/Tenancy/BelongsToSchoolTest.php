<?php

declare(strict_types=1);

use App\Domains\Academic\Models\Cycle;
use App\Domains\Academic\Models\Level;
use App\Support\Tenancy\MissingTenantContext;

it('filtre les modèles sur l’école courante', function (): void {
    $schoolA = makeSchool(['kindergarten']);
    $schoolB = makeSchool(['primary']);

    expect(inSchool($schoolA, static fn (): array => Level::query()->orderBy('position')->pluck('code')->all()))->toBe(['PS', 'MS', 'GS'])
        ->and(inSchool($schoolB, static fn (): int => Level::query()->count()))->toBe(6);
});

it('ne renvoie rien sans école courante', function (): void {
    makeSchool(['primary']);

    expect(Level::query()->count())->toBe(0)
        ->and(Cycle::query()->first())->toBeNull();
});

it('ne trouve pas un modèle d’une autre école, même par son identifiant', function (): void {
    $schoolA = makeSchool(['kindergarten']);
    $schoolB = makeSchool(['primary']);
    $levelB = inSchool($schoolB, static fn (): Level => Level::query()->firstOrFail());

    expect(inSchool($schoolA, static fn (): ?Level => Level::query()->find($levelB->id)))->toBeNull();
});

it('remplit school_id à la création depuis l’école courante', function (): void {
    $school = makeSchool();

    $cycle = inSchool($school, static fn (): Cycle => Cycle::factory()->createOne());

    expect($cycle->school_id)->toBe($school->id);
});

it('refuse une création sans école courante', function (): void {
    expect(static fn () => Cycle::factory()->createOne())->toThrow(MissingTenantContext::class);
});

it('refuse une création pour une autre école que l’école courante', function (): void {
    $schoolA = makeSchool();
    $schoolB = makeSchool();

    inSchool($schoolA, function () use ($schoolB): void {
        expect(static fn () => Cycle::factory()->createOne(['school_id' => $schoolB->id]))
            ->toThrow(MissingTenantContext::class);
    });
});

it('refuse de changer le school_id d’une ligne', function (): void {
    $schoolA = makeSchool(['primary']);
    $schoolB = makeSchool();

    inSchool($schoolA, function () use ($schoolB): void {
        $cycle = Cycle::query()->firstOrFail();
        $cycle->school_id = $schoolB->id;

        expect(static fn () => $cycle->save())->toThrow(MissingTenantContext::class);
    });
});
