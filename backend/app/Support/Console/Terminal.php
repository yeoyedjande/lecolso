<?php

declare(strict_types=1);

namespace App\Support\Console;

/**
 * Entrée standard de la console. Symfony ne considère une commande non interactive qu'avec `--no-interaction` :
 * une entrée redirigée (pipe, fichier) reste « interactive ». Les commandes qui saisissent un secret vérifient
 * donc qu'un vrai terminal est branché. Classe remplaçable dans les tests (aucun terminal sous Pest).
 */
class Terminal
{
    public function stdinIsTerminal(): bool
    {
        return defined('STDIN') && stream_isatty(STDIN);
    }
}
