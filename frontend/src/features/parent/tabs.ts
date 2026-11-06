/** Onglets de la fiche d'un enfant, ouvrables par lien (`?onglet=frais` depuis Paiements, `absences` après une justification). */
export const CHILD_TABS = ['notes', 'absences', 'bulletins', 'frais'] as const
export type ChildTab = (typeof CHILD_TABS)[number]
