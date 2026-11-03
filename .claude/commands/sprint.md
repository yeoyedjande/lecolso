---
description: Démarrer ou reprendre une étape du plan de sprint
argument-hint: <numéro du sprint> <numéro de l'étape>
---

Arguments reçus : « $ARGUMENTS » (format : `<numéro du sprint> <numéro de l'étape>`, par exemple `0 1`).

Ouvre `docs/sprints/sprint-<numéro du sprint>.md` et exécute l'étape `<numéro de l'étape>`.
Si le fichier ou l'étape n'existe pas, arrête-toi et signale-le au lieu de deviner.

Avant de coder : relis `CLAUDE.md` et les `CLAUDE.md` du backend et du frontend, vérifie que les étapes précédentes
sont bien faites (fichiers présents, `make check` vert), puis propose ton plan et attends ma validation.
À la fin : `make check`, résumé des changements, message de commit proposé, et coche l'étape dans le fichier du sprint.
