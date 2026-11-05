<?php

declare(strict_types=1);

/*
| Catalogue des permissions et permissions par défaut des rôles système (matrice du cahier des charges, section 2).
| permission => rôles système qui la détiennent. Une école peut ajuster les rôles système modifiables et créer
| ses propres rôles (table school_roles, config/roles.php) : les permissions effectives d'une école sont données
| par App\Domains\Identity\Authorization\RoleCatalog. Une affectation limitée à un cycle ne donne la permission que sur
| les ressources de ce cycle ; les ressources de toute l'école exigent une affectation sans cycle.
| Contrôle : App\Domains\Identity\Authorization\Authorizer, appelé par les Policies.
|
| Précisions du cahier, appliquées plus tard par les Policies des domaines concernés :
| - teacher : élèves et présences de SES classes, notes de SES matières ;
| - guardian : élèves, frais, notes et présences de SES enfants.
| Le super-admin n'est pas un rôle d'établissement (users.is_super_admin, routes /api/v1/platform/*).
| Groupe d'une permission (écran « Rôles et permissions ») : le préfixe avant le premier point.
*/

return [
    // Paramètres de l'école (et de ses cycles)
    'school.settings.view' => ['promoter', 'director', 'secretary'],
    'school.settings.manage' => ['promoter', 'director'],

    // Élèves et inscriptions
    'students.view' => ['promoter', 'director', 'secretary', 'accountant', 'teacher', 'guardian'],
    'students.manage' => ['director', 'secretary'],
    // Données médicales des élèves (groupe sanguin, allergies, notes) : décision du 05/11/2026, pas la comptabilité.
    // L'enseignant : élèves de ses classes ; le parent : ses enfants (même périmètre que students.view).
    'students.medical.view' => ['director', 'secretary', 'teacher', 'guardian'],

    // Frais et paiements
    'billing.view' => ['promoter', 'director', 'secretary', 'accountant', 'guardian'],
    'billing.manage' => ['director', 'accountant'],
    'billing.pay' => ['guardian'],

    // Notes et bulletins
    'grades.view' => ['promoter', 'director', 'secretary', 'teacher', 'guardian'],
    'grades.manage' => ['director', 'teacher'],
    'grades.validate' => ['director'],

    // Présences
    'attendance.view' => ['promoter', 'director', 'secretary', 'teacher', 'guardian'],
    'attendance.manage' => ['director', 'secretary', 'teacher'],
    'attendance.justify' => ['guardian'],

    // Messagerie (comptable : relances ; parent : répondre)
    'messaging.send' => ['promoter', 'director', 'secretary', 'accountant', 'teacher', 'guardian'],

    // Abonnement SaaS de l'école
    'subscription.view' => ['promoter', 'director'],
    'subscription.pay' => ['promoter'],

    // Comptes : réinitialiser le mot de passe provisoire d'un utilisateur de l'école (pas de lien par e-mail en V1)
    'users.reset_password' => ['director', 'secretary'],
    // Comptes et rôles de l'école : lister, créer, modifier, désactiver et supprimer des utilisateurs
    'users.view' => ['promoter', 'director'],
    'users.manage' => ['promoter', 'director'],
    // Créer des rôles personnalisés et ajuster les rôles système modifiables
    'roles.manage' => ['promoter', 'director'],
];
