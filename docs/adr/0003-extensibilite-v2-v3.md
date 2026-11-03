# ADR 0003 — Préparer le secondaire (V2) et le supérieur (V3) dès la V1

- Statut : accepté
- Date : 03/11/2026

## Décision

Le cœur de la V1 est générique ; seules les règles des cycles garderie, maternelle et primaire sont codées.

| Point d'extension | V1 | Ajouté plus tard |
| --- | --- | --- |
| `schools.type` | `preschool_primary` | `secondary` (V2), `higher` (V3) |
| Structure | cycle → niveau → classe | V3 : filière et parcours comme niveaux supplémentaires |
| `terms.type` | trimestre, période libre | semestre, session de rattrapage |
| `GradingStrategy` | `CompetencyStrategy`, `WeightedAverageStrategy` | `LmdCreditStrategy` (UE, ECUE, crédits, compensation) |
| Gabarits de documents | bulletin, livret, reçu, certificat | relevé de notes, attestation, diplôme |
| Payeur des factures | tuteur | élève majeur, entreprise, bourse |
| `schools.features` | modules de la V1 | cantine, transport, emplois du temps, examens… |

## Raisons

Ajouter ces points d'extension coûte peu en V1 ; les ajouter après coup imposerait de migrer toutes les données et de reprendre les écrans.

## Règle pour le code

Aucune condition sur le nom d'un cycle ou d'un type d'établissement (`if ($cycle->code === 'primaire')`) :
le comportement vient de `cycles.settings` (classe `CycleSettings`) ou d'une stratégie injectée.
