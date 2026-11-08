{{-- Reçu de paiement (A5 paysage, autonome : aucune ressource externe). Version annulée : bandeau et filigrane « ANNULÉ ». --}}
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Reçu {{ $number }}</title>
<style>
  @page { size: A5 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "DejaVu Sans", Arial, sans-serif; font-size: 10pt; color: #1b2559; position: relative; }
  header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1b2559; padding-bottom: 6px; gap: 12px; }
  header .school { display: flex; gap: 10px; align-items: center; }
  header img { width: 46px; height: 46px; object-fit: contain; }
  header h1 { font-size: 13pt; margin: 0; }
  header p { margin: 1px 0; color: #5c544a; font-size: 8.5pt; }
  header .doc { text-align: right; }
  header .doc h2 { margin: 0; font-size: 12pt; text-transform: uppercase; }
  header .doc strong { font-size: 11pt; }
  .cancelled { margin-top: 8px; border: 2px solid #b91c1c; color: #b91c1c; border-radius: 6px; padding: 6px 10px; font-weight: bold; }
  .cancelled span { display: block; font-weight: normal; font-size: 9pt; }
  .watermark { position: fixed; top: 38%; left: 0; right: 0; text-align: center; font-size: 72pt; font-weight: bold; color: rgba(185, 28, 28, 0.15); transform: rotate(-18deg); pointer-events: none; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { text-align: left; width: 34%; color: #5c544a; font-weight: normal; padding: 4px 6px; border-bottom: 1px solid #e5ded3; }
  td { padding: 4px 6px; border-bottom: 1px solid #e5ded3; }
  .amount { margin-top: 10px; background: #fbf8f3; border-radius: 8px; padding: 8px 12px; }
  .amount strong { font-size: 15pt; }
  .amount p { margin: 2px 0 0; font-style: italic; color: #5c544a; }
  footer { margin-top: 12px; display: flex; justify-content: space-between; font-size: 8.5pt; color: #5c544a; }
  footer .sign { border-top: 1px solid #1b2559; padding-top: 4px; min-width: 160px; text-align: center; }
</style>
</head>
<body>
@if ($cancellation)
  <div class="watermark">ANNULÉ</div>
@endif
<header>
  <div class="school">
    @if ($school['logo'])
      <img src="{{ $school['logo'] }}" alt="">
    @endif
    <div>
      <h1>{{ $school['name'] }}</h1>
      @if ($school['address'] || $school['city'])<p>{{ collect([$school['address'], $school['city']])->filter()->implode(', ') }}</p>@endif
      @if ($school['phone'] || $school['email'])<p>{{ collect([$school['phone'], $school['email']])->filter()->implode(' · ') }}</p>@endif
    </div>
  </div>
  <div class="doc">
    <h2>Reçu de paiement</h2>
    <strong>{{ $number }}</strong>
    <p>Le {{ $paid_at }}</p>
  </div>
</header>

@if ($cancellation)
  <div class="cancelled">
    ANNULÉ le {{ $cancellation['at'] }} par {{ $cancellation['by'] }}
    <span>Motif : {{ $cancellation['reason'] }}</span>
  </div>
@endif

<div class="amount">
  <strong>{{ $amount }}</strong>
  <p>Arrêté le présent reçu à la somme de : {{ $amount_words }}.</p>
</div>

<table>
  <tr><th>Reçu de</th><td>{{ $payer }}</td></tr>
  <tr><th>Élève</th><td>{{ $student }} · Matricule {{ $matricule }}</td></tr>
  <tr><th>Classe</th><td>{{ $classroom }} · Année scolaire {{ $year }}</td></tr>
  <tr><th>Moyen de paiement</th><td>{{ $method }}@if ($reference) · Réf. {{ $reference }}@endif</td></tr>
  <tr><th>Reste à payer au {{ $remaining_on }}</th><td>{{ $remaining }}</td></tr>
</table>

<footer>
  <div>Encaissé par {{ $cashier }}<br>Ce reçu est la preuve de votre paiement. Conservez-le précieusement.</div>
  <div class="sign">Cachet et signature</div>
</footer>
</body>
</html>
