<?php

declare(strict_types=1);

namespace App\Support\Cycles\Enums;

/** Document de fin de période (paramètre du cycle). */
enum ReportDocument: string
{
    /** Aucun */
    case None = 'none';

    /** Livret de compétences */
    case SkillsBooklet = 'skills_booklet';

    /** Bulletin */
    case ReportCard = 'report_card';

}
