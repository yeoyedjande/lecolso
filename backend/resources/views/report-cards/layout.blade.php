{{-- Gabarit commun des bulletins et livrets (A4, autonome : aucune ressource externe). --}}
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>@yield('title')</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "DejaVu Sans", Arial, sans-serif; font-size: 10.5pt; color: #1b2559; }
  .page { padding: 4mm 2mm; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1b2559; padding-bottom: 8px; gap: 12px; }
  header .school { display: flex; gap: 10px; align-items: center; }
  header img { width: 52px; height: 52px; object-fit: contain; }
  header h1 { font-size: 15pt; margin: 0; }
  header p { margin: 1px 0; color: #5c544a; font-size: 9pt; }
  header .doc { text-align: right; }
  header .doc h2 { margin: 0; font-size: 13pt; text-transform: uppercase; }
  .identity { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; background: #fbf8f3; border-radius: 8px; padding: 10px 12px; margin: 10px 0; }
  .identity .name { grid-column: span 2; font-size: 13pt; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { background: #1b2559; color: #fff; padding: 5px 6px; text-align: left; font-size: 9.5pt; }
  td { border-bottom: 1px solid #e5ded3; padding: 5px 6px; vertical-align: top; }
  .num { text-align: center; white-space: nowrap; }
  .low { color: #b91c1c; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 10px; }
  .summary div { border: 1px solid #e5ded3; border-radius: 8px; padding: 6px 8px; }
  .summary span { display: block; font-size: 8.5pt; color: #5c544a; }
  .summary strong { font-size: 12pt; }
  .comments { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 12px; }
  .comments div { border: 1px solid #e5ded3; border-radius: 8px; padding: 8px; min-height: 70px; }
  .comments h3 { margin: 0 0 4px; font-size: 9.5pt; text-transform: uppercase; }
  .mention { margin-top: 10px; font-weight: bold; font-size: 12pt; }
  .level-A { color: #166534; font-weight: bold; }
  .level-EA { color: #a14a07; font-weight: bold; }
  .level-NA { color: #b91c1c; font-weight: bold; }
  .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; }
  .signatures div { border-top: 1px solid #1b2559; padding-top: 4px; min-height: 60px; font-size: 9pt; }
  footer { margin-top: 14px; font-size: 8.5pt; color: #5c544a; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="school">
      @if ($school['logo'])
        <img src="{{ $school['logo'] }}" alt="">
      @endif
      <div>
        <h1>{{ $school['name'] }}</h1>
        @if ($school['address'] || $school['city'])<p>{{ collect([$school['address'], $school['city']])->filter()->implode(', ') }}</p>@endif
        @if ($school['phone'])<p>{{ $school['phone'] }}</p>@endif
        @if ($school['motto'])<p><em>{{ $school['motto'] }}</em></p>@endif
      </div>
    </div>
    <div class="doc">
      <h2>@yield('title')</h2>
      <p><strong>{{ $term }}</strong></p>
      <p>Année scolaire {{ $year }}</p>
    </div>
  </header>

  <section class="identity">
    <div class="name">{{ $student['name'] }}</div>
    <div>Né(e) le {{ $student['birth_date'] }} · Matricule {{ $student['matricule'] }}</div>
    <div>Classe : {{ $classroom }} ({{ $class_size }} élèves)</div>
    <div>Enseignant(e) : {{ $teacher ?? '—' }}</div>
    <div>Absences : {{ $absences }} · Retards : {{ $lates }}</div>
  </section>

  @yield('content')

  <section class="comments">
    <div>
      <h3>Appréciation de l’enseignant(e)</h3>
      {{ $teacher_comment ?? '' }}
    </div>
    <div>
      <h3>Observation de la direction</h3>
      {{ $director_comment ?? '' }}
    </div>
  </section>
  @if ($mention)
    <p class="mention">Mention : {{ $mention }}</p>
  @endif

  <section class="signatures">
    <div>L’enseignant(e)</div>
    <div>La direction (cachet)</div>
    <div>Les parents</div>
  </section>

  <footer>
    <span>Validé le {{ $validated_on }} par {{ $validated_by }}</span>
    <span>Document établi par EKALEWA</span>
  </footer>
</div>
</body>
</html>
