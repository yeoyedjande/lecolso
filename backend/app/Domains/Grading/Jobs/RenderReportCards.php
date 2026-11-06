<?php

declare(strict_types=1);

namespace App\Domains\Grading\Jobs;

use App\Domains\Grading\Enums\ReportCardStatus;
use App\Domains\Grading\Models\ReportCard;
use App\Domains\Grading\Models\TermClosure;
use App\Domains\Grading\Support\ReportCardBuilder;
use App\Domains\Grading\Support\ReportCardFile;
use App\Support\Pdf\PdfRenderer;
use App\Support\Pdf\PdfRenderingFailed;
use App\Support\Tenancy\RunsInSchool;
use App\Support\Tenancy\TenantAware;
use App\Support\Tenancy\TenantContext;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Filesystem\Factory as Filesystems;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Contracts\View\Factory as Views;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Rendu des bulletins PDF d'une classe validée, dans l'école de la validation : gabarit Blade du document du cycle,
 * PdfRenderer (Gotenberg), fichier privé à nom aléatoire. Un bulletin en échec est noté (`failed`) : la direction relance
 * le rendu. Une validation rouverte entre-temps n'est pas rendue. Aucune donnée d'élève n'est journalisée.
 */
final class RenderReportCards implements ShouldQueue, TenantAware
{
    use Dispatchable, InteractsWithQueue, Queueable, RunsInSchool;

    public int $tries = 1;

    public int $timeout = 600;

    public function __construct(
        public string $schoolId,
        public string $closureId,
    ) {}

    public function handle(ReportCardBuilder $builder, PdfRenderer $renderer, Views $views, Filesystems $filesystems, TenantContext $context): void
    {
        $closure = TermClosure::query()->find($this->closureId);
        $school = $context->school();
        if ($closure === null || $closure->reopened_at !== null || $school === null) {
            return;
        }

        $documents = $builder->build($school, $closure);
        $disk = $filesystems->disk();
        $template = $documents['template'] === 'skills_booklet' ? 'report-cards.skills_booklet' : 'report-cards.report_card';
        foreach (ReportCard::query()->where('term_closure_id', $closure->id)->where('status', '!=', ReportCardStatus::Ready)->get() as $card) {
            $data = $documents['students'][$card->student_id] ?? null;
            if ($data === null) {
                $card->fill(['status' => ReportCardStatus::Failed])->save();

                continue;
            }
            try {
                $pdf = $renderer->render($views->make($template, $data)->render());
                $path = ReportCardFile::path(Str::uuid()->toString().'.pdf');
                $disk->put($path, $pdf);
                $card->fill(['status' => ReportCardStatus::Ready, 'path' => $path, 'rendered_at' => Carbon::now()])->save();
            } catch (PdfRenderingFailed) {
                $card->fill(['status' => ReportCardStatus::Failed])->save();
            }
        }
    }
}
