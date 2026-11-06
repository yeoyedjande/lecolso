<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Actions;

use App\Domains\Attendance\Enums\JustificationSource;
use App\Domains\Attendance\Enums\JustificationStatus;
use App\Domains\Attendance\Models\AbsenceJustification;
use App\Domains\Attendance\Models\AttendanceMark;
use App\Domains\Attendance\Support\AbsenceProof;
use App\Domains\Identity\Models\User;
use App\Support\Http\BusinessConflict;
use App\Support\Images\WebpImage;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * Justification d'une absence ou d'un retard (décision du 05/11/2026) : le parent propose un motif (et une photo du
 * certificat, facultative), l'école accepte ou refuse ; l'école peut aussi justifier directement (acceptée).
 * Le parent peut remplacer sa justification tant qu'elle n'est pas acceptée.
 */
final readonly class JustifyAbsence
{
    private const int PROOF_SIDE = 1600;

    public function __construct(private Filesystems $filesystems) {}

    /**
     * @throws BusinessConflict already_justified
     */
    public function handle(User $author, AttendanceMark $mark, string $reason, ?UploadedFile $proof, JustificationSource $source, Carbon $now): AbsenceJustification
    {
        $existing = AbsenceJustification::query()->where('attendance_mark_id', $mark->id)->first();
        if ($existing?->status === JustificationStatus::Accepted) {
            throw new BusinessConflict('already_justified', 'Cette absence est déjà justifiée.');
        }

        $path = $proof === null ? null : $this->store($proof);
        $school = $source === JustificationSource::School;

        try {
            return DB::transaction(function () use ($author, $mark, $reason, $path, $source, $school, $now, $existing): AbsenceJustification {
                $previous = $existing?->proof_path;
                $justification = $existing ?? new AbsenceJustification(['attendance_mark_id' => $mark->id]);
                $justification->fill([
                    'reason' => $reason,
                    'proof_path' => $path ?? ($school ? $previous : null),
                    'source' => $source,
                    'status' => $school ? JustificationStatus::Accepted : JustificationStatus::Pending,
                    'submitted_by' => $author->id,
                    'submitted_by_name' => $author->name,
                    'decided_by' => $school ? $author->id : null,
                    'decided_by_name' => $school ? $author->name : null,
                    'decided_at' => $school ? $now : null,
                    'decision_note' => null,
                ])->save();

                if ($previous !== null && $previous !== $justification->proof_path) {
                    DB::afterCommit(fn (): bool => $this->filesystems->disk()->delete($previous));
                }

                return $justification;
            });
        } catch (Throwable $error) {
            if ($path !== null) {
                $this->filesystems->disk()->delete($path);
            }
            throw $error;
        }
    }

    private function store(UploadedFile $file): string
    {
        $webp = WebpImage::fromBytes((string) $file->get(), self::PROOF_SIDE, 80);
        $path = AbsenceProof::path(Str::uuid()->toString().'.webp');
        if (! $this->filesystems->disk()->put($path, $webp)) {
            throw new RuntimeException('Enregistrement du justificatif impossible.');
        }

        return $path;
    }
}
