<?php

declare(strict_types=1);

namespace App\Domains\Tenancy\Http\Controllers;

use App\Domains\Tenancy\Actions\RemoveSchoolLogo;
use App\Domains\Tenancy\Actions\StoreSchoolLogo;
use App\Domains\Tenancy\Actions\UpdateSchoolProfile;
use App\Domains\Tenancy\Actions\UpdateSchoolSettings;
use App\Domains\Tenancy\Http\Requests\ManageSchoolRequest;
use App\Domains\Tenancy\Http\Requests\ShowSchoolProfileRequest;
use App\Domains\Tenancy\Http\Requests\UpdateSchoolProfileRequest;
use App\Domains\Tenancy\Http\Requests\UploadSchoolLogoRequest;
use App\Domains\Tenancy\Http\Resources\SchoolProfileResource;

final class SchoolProfileController
{
    /**
     * Identité de l'école courante.
     *
     * Nom, coordonnées, devise et logo (URL signée de 30 minutes). Tout membre de l'école.
     */
    public function show(ShowSchoolProfileRequest $request): SchoolProfileResource
    {
        return new SchoolProfileResource($request->school());
    }

    /**
     * Modifier l'identité de l'école.
     *
     * Champs envoyés seulement ; chaîne vide = effacer. Permission school.settings.manage sur toute l'école.
     * Ces coordonnées sont affichées sur la page publique de l'école.
     */
    public function update(UpdateSchoolProfileRequest $request, UpdateSchoolProfile $update, UpdateSchoolSettings $settings): SchoolProfileResource
    {
        $school = $update->handle($request->school(), $request->profileAttributes());
        if ($request->settings() !== []) {
            $school = $settings->handle($school, $request->settings());
        }

        return new SchoolProfileResource($school);
    }

    /**
     * Envoyer le logo.
     *
     * multipart/form-data, champ `logo` : JPEG, PNG ou WebP, 2 Mo au plus. Converti en WebP de 512 px au plus,
     * sans métadonnées ; remplace le logo précédent.
     */
    public function uploadLogo(UploadSchoolLogoRequest $request, StoreSchoolLogo $store): SchoolProfileResource
    {
        return new SchoolProfileResource($store->handle($request->school(), $request->logo()));
    }

    /** Retirer le logo. */
    public function removeLogo(ManageSchoolRequest $request, RemoveSchoolLogo $remove): SchoolProfileResource
    {
        return new SchoolProfileResource($remove->handle($request->school()));
    }
}
