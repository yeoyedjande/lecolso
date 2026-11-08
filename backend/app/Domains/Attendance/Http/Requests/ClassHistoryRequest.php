<?php

declare(strict_types=1);

namespace App\Domains\Attendance\Http\Requests;

/** Historique des présences d'une classe : `from` et `to` (AAAA-MM-JJ, 62 jours au plus). */
final class ClassHistoryRequest extends ClassroomAttendanceRequest
{
    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from', 'before_or_equal:'.$this->limit()],
        ];
    }

    private function limit(): string
    {
        $from = $this->string('from')->toString();

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) === 1 ? date('Y-m-d', (int) strtotime($from.' +62 days')) : '9999-12-31';
    }
}
