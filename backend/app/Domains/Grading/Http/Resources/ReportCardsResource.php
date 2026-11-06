<?php

declare(strict_types=1);

namespace App\Domains\Grading\Http\Resources;

use App\Domains\Grading\Data\ReportCardsView;
use App\Domains\Grading\Enums\ReportCardStatus;
use App\Domains\Grading\Models\Subject;
use App\Domains\Grading\Support\ReportCardFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bulletins d'une classe pour une période : document du cycle (report_card, skills_booklet), validation en cours et
 * historique, seuils des mentions, une ligne par élève, droits (appréciations, validation).
 *
 * @property-read ReportCardsView $resource
 */
final class ReportCardsResource extends JsonResource
{
    /**
     * @return array{classroom: array{id: string, name: string}, document: string, grade_scale: int, terms: AnonymousResourceCollection, term: TermResource, subjects: AnonymousResourceCollection, thresholds: array{congratulations: float, honor_roll: float, encouragement: float, warning_below: float}, closure: TermClosureResource|null, history: AnonymousResourceCollection, rows: AnonymousResourceCollection, ready_count: int, failed_count: int, can_comment: bool, can_validate: bool}
     */
    public function toArray(Request $request): array
    {
        $view = $this->resource;
        $settings = $view->classroom->level->cycle->settings;
        $files = app(ReportCardFile::class);

        $rows = [];
        foreach ($view->students as $student) {
            $result = $view->results->for($student->id);
            $appreciation = $view->appreciations[$student->id] ?? null;
            $proposed = $view->proposed[$student->id] ?? null;
            $chosen = $appreciation !== null && $appreciation->mention_chosen;
            $card = $view->reportCards[$student->id] ?? null;
            $comments = $view->subjectComments[$student->id] ?? [];
            $rows[] = [
                'student' => $student,
                'average' => $result?->average,
                'rank' => $result?->rank,
                'skills' => $result?->skills,
                // Validée : la mention figée ; sinon celle choisie, ou à défaut la proposée
                'mention' => $view->closure !== null ? $appreciation?->mention : ($chosen ? $appreciation->mention : $proposed),
                'mention_proposed' => $proposed,
                'mention_chosen' => $chosen,
                'teacher_comment' => $appreciation?->teacher_comment,
                'director_comment' => $appreciation?->director_comment,
                'subjects' => array_values($view->subjects->map(static fn (Subject $subject): array => [
                    'subject_id' => $subject->id,
                    'average' => $result?->subjects[$subject->id] ?? null,
                    'comment' => $comments[$subject->id] ?? null,
                ])->all()),
                'report_card' => $card,
                'pdf_url' => $card === null ? null : $files->url($card->path),
            ];
        }
        $cards = array_values($view->reportCards);

        return [
            'classroom' => ['id' => $view->classroom->id, 'name' => $view->classroom->name()],
            'document' => $settings->reportDocument->value,
            'grade_scale' => $settings->gradeScale->max(),
            'terms' => TermResource::collection($view->terms),
            'term' => new TermResource($view->term),
            'subjects' => SubjectResource::collection($view->subjects),
            'thresholds' => $view->thresholds,
            'closure' => $view->closure === null ? null : new TermClosureResource($view->closure),
            'history' => TermClosureResource::collection($view->history),
            'rows' => ReportCardRowResource::collection($rows),
            'ready_count' => count(array_filter($cards, static fn ($card): bool => $card->status === ReportCardStatus::Ready)),
            'failed_count' => count(array_filter($cards, static fn ($card): bool => $card->status === ReportCardStatus::Failed)),
            'can_comment' => $view->canComment,
            'can_validate' => $view->canValidate,
        ];
    }
}
