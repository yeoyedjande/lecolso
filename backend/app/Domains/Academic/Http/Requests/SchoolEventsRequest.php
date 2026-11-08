<?php

declare(strict_types=1);

namespace App\Domains\Academic\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Événements du calendrier qui recoupent la période `from` → `to` (AAAA-MM-JJ, 400 jours au plus). */
final class SchoolEventsRequest extends FormRequest
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

        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) === 1 ? date('Y-m-d', (int) strtotime($from.' +400 days')) : '9999-12-31';
    }
}
