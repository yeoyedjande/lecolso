@php($format = static fn (?float $value): string => $value === null ? '—' : number_format($value, 2, ',', ' '))
@extends('report-cards.layout')

@section('title', 'Bulletin de notes')

@section('content')
  <table>
    <thead>
      <tr><th>Matière</th><th class="num">Coef.</th><th class="num">Moyenne /{{ $scale }}</th><th>Appréciation</th></tr>
    </thead>
    <tbody>
      @foreach ($subjects as $subject)
        <tr>
          <td>{{ $subject['name'] }}</td>
          <td class="num">{{ $subject['coefficient'] }}</td>
          <td class="num {{ $subject['average'] !== null && $subject['average'] < $scale / 2 ? 'low' : '' }}">{{ $format($subject['average']) }}</td>
          <td>{{ $subject['comment'] ?? '' }}</td>
        </tr>
      @endforeach
    </tbody>
  </table>

  <section class="summary">
    <div><span>Moyenne générale /{{ $scale }}</span><strong class="{{ $average !== null && $average < $scale / 2 ? 'low' : '' }}">{{ $format($average) }}</strong></div>
    <div><span>Rang</span><strong>{{ $rank ?? '—' }}</strong> <span>sur {{ $class_size }}</span></div>
    <div><span>Moyenne de la classe</span><strong>{{ $format($class_average) }}</strong></div>
    <div><span>Plus forte / plus faible</span><strong>{{ $format($highest) }} / {{ $format($lowest) }}</strong></div>
  </section>
@endsection
