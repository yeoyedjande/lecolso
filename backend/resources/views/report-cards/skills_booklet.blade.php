@php($labels = ['A' => 'Acquis', 'EA' => 'En cours d’acquisition', 'NA' => 'Non acquis'])
@extends('report-cards.layout')

@section('title', 'Livret de compétences')

@section('content')
  @foreach ($domains as $domain)
    <table>
      <thead>
        <tr><th>{{ $domain['name'] }}</th><th class="num" style="width: 34%">Niveau</th></tr>
      </thead>
      <tbody>
        @foreach ($domain['skills'] as $skill)
          <tr>
            <td>{{ $skill['label'] }}</td>
            <td class="num">
              @if ($skill['level'])
                <span class="level-{{ $skill['level'] }}">{{ $skill['level'] }}</span> — {{ $labels[$skill['level']] }}
              @else
                Non évaluée
              @endif
            </td>
          </tr>
        @endforeach
      </tbody>
    </table>
  @endforeach
@endsection
