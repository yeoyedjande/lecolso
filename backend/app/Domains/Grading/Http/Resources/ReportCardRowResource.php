<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Enums\Mention;
use App\Domains\Grading\Enums\ReportCardStatus;
use App\Domains\Grading\Models\ReportCard;
use App\Domains\Students\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Ligne d'un bulletin : résultats, mention (retenue, proposée, choisie par la direction), appréciations et PDF
 * (`pdf_url` signée, 10 minutes, quand le bulletin est prêt).
 *
 * @property-read array{student: Student, average: float|null, rank: int|null, skills: array{A: int, EA: int, NA: int}|null, mention: Mention|null, mention_proposed: Mention|null, mention_chosen: bool, teacher_comment: string|null, director_comment: string|null, subjects: list<array{subject_id: string, average: float|null, comment: string|null}>, report_card: ReportCard|null, pdf_url: string|null} $resource
 */
final class ReportCardRowResource extends JsonResource
{
    /**
     * @return array{student: GradingStudentResource, average: float|null, rank: int|null, skills: array{A: int, EA: int, NA: int}|null, mention: string|null, mention_proposed: string|null, mention_chosen: bool, teacher_comment: string|null, director_comment: string|null, subjects: AnonymousResourceCollection, report_card: array{id: string, status: string, pdf_url: string|null}|null}
     */
    public function toArray(Request $request): array
    {
        $row = $this->resource;
        $card = $row['report_card'];
        $skills = $row['skills'];

        return [
            'student' => new GradingStudentResource($row['student']),
            'average' => $row['average'] === null ? null : (float) $row['average'],
            'rank' => $row['rank'] === null ? null : (int) $row['rank'],
            'skills' => $skills === null ? null : ['A' => (int) $skills['A'], 'EA' => (int) $skills['EA'], 'NA' => (int) $skills['NA']],
            'mention' => $row['mention'] === null ? null : $row['mention']->value,
            'mention_proposed' => $row['mention_proposed'] === null ? null : $row['mention_proposed']->value,
            'mention_chosen' => (bool) $row['mention_chosen'],
            'teacher_comment' => $row['teacher_comment'] === null ? null : (string) $row['teacher_comment'],
            'director_comment' => $row['director_comment'] === null ? null : (string) $row['director_comment'],
            'subjects' => SubjectCommentResource::collection($row['subjects']),
            'report_card' => $card === null ? null : [
                'id' => $card->id,
                'status' => $card->status->value,
                'pdf_url' => $card->status === ReportCardStatus::Ready ? $row['pdf_url'] : null,
            ],
        ];
    }
}
