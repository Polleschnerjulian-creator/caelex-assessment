/**
 * Caelex Scholar — saved / Merkliste namespace (`saved`).
 *
 * Every user-visible UI string of the "Merkliste" (saved) surface and its
 * controls: the /scholar/saved hub page, the /scholar/lists/[id] reading-list
 * page, the SavedControls client wrappers (remove / create / rename / delete),
 * the BookmarkButton detail-page toggle, and the AddToListMenu dropdown.
 *
 * EN is the source of truth; the `de` values are the strings previously
 * hardcoded in those files. it/fr/es are domain-appropriate legal/academic
 * translations. Legal CONTENT (corpus text) is NOT translated here — only the
 * surrounding UI chrome.
 *
 * Shared terms (Save, Cancel, Delete, optional, …) live in the `common`
 * namespace and are reused via t(locale, COMMON, "key"); this file only adds
 * saved-surface-specific keys.
 *
 * A few strings carry a `{name}` / `{title}` placeholder that is substituted at
 * the call site (the dictionary value keeps the token verbatim).
 *
 * Resolve with: t(locale, SAVED, "key")
 */
import type { ScholarNamespace } from "./core";

export const SAVED = {
  en: {
    // ── /scholar/saved — page header ──
    pageTitle: "Saved",
    pageSubtitle:
      "Saved sources and decisions, plus your reading lists for research and teaching, all in one place",

    // ── Section 1: bookmarks ──
    bookmarksHeading: "Saved sources & cases",
    bookmarksEmpty:
      "Nothing saved yet — use the bookmark on a source or decision.",

    // ── Section 2: reading lists ──
    listsHeading: "Reading lists",
    listsEmpty:
      "No reading lists yet. Reading lists work well as course lists for teaching — bundle a seminar's required reading and share it with your students.",
    createListHeading: "Create a new list",

    // ── Item count (reading-list rows + list page) ──
    entryOne: "entry",
    entryOther: "entries",

    // ── Saved-row item type labels ──
    typeCase: "Decision",
    typeSource: "Source",

    // ── /scholar/lists/[id] ──
    backToSaved: "Back to saved",
    listEyebrow: "Reading list",
    itemsHeading: "Entries",
    exportList: "Export list",
    listEmpty:
      "This list is empty. Open a source or decision and add it to this list to assemble your required reading.",

    // ── RemoveBookmarkButton ──
    removeFromSavedTitle: "Remove from saved",
    removeFromSavedSr: "Remove “{title}” from saved", // {title} substituted
    removeFailed: "Removal failed. Please try again.",

    // ── RemoveFromListButton ──
    removeFromListTitle: "Remove from list",
    removeFromListSr: "Remove “{title}” from this list", // {title} substituted

    // ── CreateListForm ──
    createFormLabel: "Create a new reading list",
    listNameLabel: "List name",
    listNamePlaceholder: "e.g. Space Law seminar — week 3",
    listDescLabel: "Description",
    listDescPlaceholder: "A short note for students or the team",
    nameRequired: "Please enter a name for the list.",
    createFailed: "The list could not be created. Please try again.",
    creating: "Creating …",
    createList: "Create list",

    // ── ListManageControls ──
    renameFormLabel: "Rename reading list",
    renameInputSr: "New list name",
    nameNotEmpty: "The name cannot be empty.",
    renameFailed: "Rename failed. Please try again.",
    saving: "Saving …",
    rename: "Rename",
    deleting: "Deleting …",
    deleteConfirm:
      "Really delete the reading list “{name}”? The references it contains will be lost (the sources themselves are kept).", // {name} substituted
    deleteFailed: "Deletion failed. Please try again.",

    // ── BookmarkButton ──
    bookmarkSaved: "Saved",
    bookmarkSave: "Save",
    bookmarkAddedAnnounce: "Added to saved",
    bookmarkRemovedAnnounce: "Removed from saved",

    // ── AddToListMenu ──
    addToList: "Add to reading list",
    addToListMenuLabel: "Add to reading list",
    noListsYet: "No reading lists yet.",
    newListItem: "New list…",
    newListNameSr: "Name of the new reading list",
    newListPlaceholder: "List name",
    createAndAdd: "Create & add",
    enterName: "Please enter a name.",
    addFailed: "Could not be added.",
    createListFailed: "The list could not be created.",
    createdNotAdded: "Created, but not added.",
    addedToList: "Added to {name}", // {name} substituted
    added: "Added",
  },

  de: {
    // ── /scholar/saved — page header ──
    pageTitle: "Merkliste",
    pageSubtitle:
      "Gemerkte Quellen und Entscheidungen sowie deine Leselisten für Recherche und Lehre an einem Ort",

    // ── Section 1: bookmarks ──
    bookmarksHeading: "Gemerkte Quellen & Fälle",
    bookmarksEmpty:
      "Noch nichts gemerkt — nutze das Lesezeichen auf einer Quelle oder Entscheidung.",

    // ── Section 2: reading lists ──
    listsHeading: "Leselisten",
    listsEmpty:
      "Noch keine Leselisten. Leselisten eignen sich gut als Kurslisten für die Lehre — bündle die Pflichtlektüre eines Seminars und teile sie mit deinen Studierenden.",
    createListHeading: "Neue Liste erstellen",

    // ── Item count ──
    entryOne: "Eintrag",
    entryOther: "Einträge",

    // ── Saved-row item type labels ──
    typeCase: "Entscheidung",
    typeSource: "Quelle",

    // ── /scholar/lists/[id] ──
    backToSaved: "Zurück zur Merkliste",
    listEyebrow: "Leseliste",
    itemsHeading: "Einträge",
    exportList: "Liste exportieren",
    listEmpty:
      "Diese Liste ist noch leer. Öffne eine Quelle oder Entscheidung und füge sie dieser Liste hinzu, um deine Pflichtlektüre zusammenzustellen.",

    // ── RemoveBookmarkButton ──
    removeFromSavedTitle: "Aus Merkliste entfernen",
    removeFromSavedSr: "„{title}“ aus Merkliste entfernen",
    removeFailed: "Entfernen fehlgeschlagen. Bitte erneut versuchen.",

    // ── RemoveFromListButton ──
    removeFromListTitle: "Aus Liste entfernen",
    removeFromListSr: "„{title}“ aus dieser Liste entfernen",

    // ── CreateListForm ──
    createFormLabel: "Neue Leseliste erstellen",
    listNameLabel: "Name der Liste",
    listNamePlaceholder: "z. B. Seminar Weltraumrecht — Woche 3",
    listDescLabel: "Beschreibung",
    listDescPlaceholder: "Kurzer Hinweis für Studierende oder das Team",
    nameRequired: "Bitte gib einen Namen für die Liste ein.",
    createFailed: "Liste konnte nicht erstellt werden. Bitte erneut versuchen.",
    creating: "Wird erstellt …",
    createList: "Liste erstellen",

    // ── ListManageControls ──
    renameFormLabel: "Leseliste umbenennen",
    renameInputSr: "Neuer Name der Liste",
    nameNotEmpty: "Der Name darf nicht leer sein.",
    renameFailed: "Umbenennen fehlgeschlagen. Bitte erneut versuchen.",
    saving: "Speichert …",
    rename: "Umbenennen",
    deleting: "Löscht …",
    deleteConfirm:
      "Leseliste „{name}“ wirklich löschen? Die enthaltenen Verweise gehen verloren (die Quellen selbst bleiben erhalten).",
    deleteFailed: "Löschen fehlgeschlagen. Bitte erneut versuchen.",

    // ── BookmarkButton ──
    bookmarkSaved: "Gemerkt",
    bookmarkSave: "Merken",
    bookmarkAddedAnnounce: "Zur Merkliste hinzugefügt",
    bookmarkRemovedAnnounce: "Von der Merkliste entfernt",

    // ── AddToListMenu ──
    addToList: "Zu Leseliste hinzufügen",
    addToListMenuLabel: "Zu Leseliste hinzufügen",
    noListsYet: "Noch keine Leselisten.",
    newListItem: "Neue Liste…",
    newListNameSr: "Name der neuen Leseliste",
    newListPlaceholder: "Listenname",
    createAndAdd: "Erstellen & hinzufügen",
    enterName: "Bitte einen Namen eingeben.",
    addFailed: "Konnte nicht hinzugefügt werden.",
    createListFailed: "Liste konnte nicht erstellt werden.",
    createdNotAdded: "Erstellt, aber nicht hinzugefügt.",
    addedToList: "Hinzugefügt zu {name}",
    added: "Hinzugefügt",
  },

  it: {
    // ── /scholar/saved — page header ──
    pageTitle: "Salvati",
    pageSubtitle:
      "Fonti e decisioni salvate, oltre alle tue liste di lettura per la ricerca e la didattica, tutto in un unico posto",

    // ── Section 1: bookmarks ──
    bookmarksHeading: "Fonti e casi salvati",
    bookmarksEmpty:
      "Ancora nulla salvato — usa il segnalibro su una fonte o una decisione.",

    // ── Section 2: reading lists ──
    listsHeading: "Liste di lettura",
    listsEmpty:
      "Ancora nessuna lista di lettura. Le liste di lettura funzionano bene come liste di corso per la didattica — raccogli le letture obbligatorie di un seminario e condividile con i tuoi studenti.",
    createListHeading: "Crea una nuova lista",

    // ── Item count ──
    entryOne: "voce",
    entryOther: "voci",

    // ── Saved-row item type labels ──
    typeCase: "Decisione",
    typeSource: "Fonte",

    // ── /scholar/lists/[id] ──
    backToSaved: "Torna ai salvati",
    listEyebrow: "Lista di lettura",
    itemsHeading: "Voci",
    listEmpty:
      "Questa lista è ancora vuota. Apri una fonte o una decisione e aggiungila a questa lista per comporre le tue letture obbligatorie.",

    // ── RemoveBookmarkButton ──
    removeFromSavedTitle: "Rimuovi dai salvati",
    removeFromSavedSr: "Rimuovi «{title}» dai salvati",
    removeFailed: "Rimozione non riuscita. Riprova.",

    // ── RemoveFromListButton ──
    removeFromListTitle: "Rimuovi dalla lista",
    removeFromListSr: "Rimuovi «{title}» da questa lista",

    // ── CreateListForm ──
    createFormLabel: "Crea una nuova lista di lettura",
    listNameLabel: "Nome della lista",
    listNamePlaceholder: "es. Seminario di Diritto spaziale — settimana 3",
    listDescLabel: "Descrizione",
    listDescPlaceholder: "Una breve nota per gli studenti o il team",
    nameRequired: "Inserisci un nome per la lista.",
    createFailed: "Impossibile creare la lista. Riprova.",
    creating: "Creazione in corso …",
    createList: "Crea lista",

    // ── ListManageControls ──
    renameFormLabel: "Rinomina lista di lettura",
    renameInputSr: "Nuovo nome della lista",
    nameNotEmpty: "Il nome non può essere vuoto.",
    renameFailed: "Rinomina non riuscita. Riprova.",
    saving: "Salvataggio …",
    rename: "Rinomina",
    deleting: "Eliminazione …",
    deleteConfirm:
      "Eliminare davvero la lista di lettura «{name}»? I riferimenti che contiene andranno persi (le fonti stesse vengono conservate).",
    deleteFailed: "Eliminazione non riuscita. Riprova.",

    // ── BookmarkButton ──
    bookmarkSaved: "Salvato",
    bookmarkSave: "Salva",
    bookmarkAddedAnnounce: "Aggiunto ai salvati",
    bookmarkRemovedAnnounce: "Rimosso dai salvati",

    // ── AddToListMenu ──
    addToList: "Aggiungi alla lista di lettura",
    addToListMenuLabel: "Aggiungi alla lista di lettura",
    noListsYet: "Ancora nessuna lista di lettura.",
    newListItem: "Nuova lista…",
    newListNameSr: "Nome della nuova lista di lettura",
    newListPlaceholder: "Nome della lista",
    createAndAdd: "Crea e aggiungi",
    enterName: "Inserisci un nome.",
    addFailed: "Impossibile aggiungere.",
    createListFailed: "Impossibile creare la lista.",
    createdNotAdded: "Creata, ma non aggiunta.",
    addedToList: "Aggiunto a {name}",
    added: "Aggiunto",
  },

  fr: {
    // ── /scholar/saved — page header ──
    pageTitle: "Enregistrés",
    pageSubtitle:
      "Sources et décisions enregistrées, ainsi que vos listes de lecture pour la recherche et l’enseignement, au même endroit",

    // ── Section 1: bookmarks ──
    bookmarksHeading: "Sources et affaires enregistrées",
    bookmarksEmpty:
      "Rien d’enregistré pour l’instant — utilisez le favori sur une source ou une décision.",

    // ── Section 2: reading lists ──
    listsHeading: "Listes de lecture",
    listsEmpty:
      "Aucune liste de lecture pour l’instant. Les listes de lecture conviennent bien comme listes de cours pour l’enseignement — regroupez les lectures obligatoires d’un séminaire et partagez-les avec vos étudiants.",
    createListHeading: "Créer une nouvelle liste",

    // ── Item count ──
    entryOne: "entrée",
    entryOther: "entrées",

    // ── Saved-row item type labels ──
    typeCase: "Décision",
    typeSource: "Source",

    // ── /scholar/lists/[id] ──
    backToSaved: "Retour aux enregistrés",
    listEyebrow: "Liste de lecture",
    itemsHeading: "Entrées",
    listEmpty:
      "Cette liste est encore vide. Ouvrez une source ou une décision et ajoutez-la à cette liste pour composer vos lectures obligatoires.",

    // ── RemoveBookmarkButton ──
    removeFromSavedTitle: "Retirer des enregistrés",
    removeFromSavedSr: "Retirer « {title} » des enregistrés",
    removeFailed: "Échec du retrait. Veuillez réessayer.",

    // ── RemoveFromListButton ──
    removeFromListTitle: "Retirer de la liste",
    removeFromListSr: "Retirer « {title} » de cette liste",

    // ── CreateListForm ──
    createFormLabel: "Créer une nouvelle liste de lecture",
    listNameLabel: "Nom de la liste",
    listNamePlaceholder: "p. ex. Séminaire de droit spatial — semaine 3",
    listDescLabel: "Description",
    listDescPlaceholder: "Une courte note pour les étudiants ou l’équipe",
    nameRequired: "Veuillez saisir un nom pour la liste.",
    createFailed: "La liste n’a pas pu être créée. Veuillez réessayer.",
    creating: "Création …",
    createList: "Créer la liste",

    // ── ListManageControls ──
    renameFormLabel: "Renommer la liste de lecture",
    renameInputSr: "Nouveau nom de la liste",
    nameNotEmpty: "Le nom ne peut pas être vide.",
    renameFailed: "Échec du renommage. Veuillez réessayer.",
    saving: "Enregistrement …",
    rename: "Renommer",
    deleting: "Suppression …",
    deleteConfirm:
      "Supprimer vraiment la liste de lecture « {name} » ? Les références qu’elle contient seront perdues (les sources elles-mêmes sont conservées).",
    deleteFailed: "Échec de la suppression. Veuillez réessayer.",

    // ── BookmarkButton ──
    bookmarkSaved: "Enregistré",
    bookmarkSave: "Enregistrer",
    bookmarkAddedAnnounce: "Ajouté aux enregistrés",
    bookmarkRemovedAnnounce: "Retiré des enregistrés",

    // ── AddToListMenu ──
    addToList: "Ajouter à la liste de lecture",
    addToListMenuLabel: "Ajouter à la liste de lecture",
    noListsYet: "Aucune liste de lecture pour l’instant.",
    newListItem: "Nouvelle liste…",
    newListNameSr: "Nom de la nouvelle liste de lecture",
    newListPlaceholder: "Nom de la liste",
    createAndAdd: "Créer et ajouter",
    enterName: "Veuillez saisir un nom.",
    addFailed: "Impossible d’ajouter.",
    createListFailed: "La liste n’a pas pu être créée.",
    createdNotAdded: "Créée, mais non ajoutée.",
    addedToList: "Ajouté à {name}",
    added: "Ajouté",
  },

  es: {
    // ── /scholar/saved — page header ──
    pageTitle: "Guardados",
    pageSubtitle:
      "Fuentes y decisiones guardadas, además de tus listas de lectura para la investigación y la docencia, todo en un solo lugar",

    // ── Section 1: bookmarks ──
    bookmarksHeading: "Fuentes y casos guardados",
    bookmarksEmpty:
      "Aún no hay nada guardado — usa el marcador en una fuente o una decisión.",

    // ── Section 2: reading lists ──
    listsHeading: "Listas de lectura",
    listsEmpty:
      "Aún no hay listas de lectura. Las listas de lectura funcionan bien como listas de curso para la docencia — reúne la lectura obligatoria de un seminario y compártela con tus estudiantes.",
    createListHeading: "Crear una nueva lista",

    // ── Item count ──
    entryOne: "entrada",
    entryOther: "entradas",

    // ── Saved-row item type labels ──
    typeCase: "Decisión",
    typeSource: "Fuente",

    // ── /scholar/lists/[id] ──
    backToSaved: "Volver a guardados",
    listEyebrow: "Lista de lectura",
    itemsHeading: "Entradas",
    listEmpty:
      "Esta lista aún está vacía. Abre una fuente o una decisión y añádela a esta lista para componer tu lectura obligatoria.",

    // ── RemoveBookmarkButton ──
    removeFromSavedTitle: "Quitar de guardados",
    removeFromSavedSr: "Quitar «{title}» de guardados",
    removeFailed: "Error al quitar. Inténtalo de nuevo.",

    // ── RemoveFromListButton ──
    removeFromListTitle: "Quitar de la lista",
    removeFromListSr: "Quitar «{title}» de esta lista",

    // ── CreateListForm ──
    createFormLabel: "Crear una nueva lista de lectura",
    listNameLabel: "Nombre de la lista",
    listNamePlaceholder: "p. ej. Seminario de Derecho espacial — semana 3",
    listDescLabel: "Descripción",
    listDescPlaceholder: "Una breve nota para los estudiantes o el equipo",
    nameRequired: "Introduce un nombre para la lista.",
    createFailed: "No se ha podido crear la lista. Inténtalo de nuevo.",
    creating: "Creando …",
    createList: "Crear lista",

    // ── ListManageControls ──
    renameFormLabel: "Cambiar el nombre de la lista de lectura",
    renameInputSr: "Nuevo nombre de la lista",
    nameNotEmpty: "El nombre no puede estar vacío.",
    renameFailed: "Error al cambiar el nombre. Inténtalo de nuevo.",
    saving: "Guardando …",
    rename: "Cambiar nombre",
    deleting: "Eliminando …",
    deleteConfirm:
      "¿Eliminar realmente la lista de lectura «{name}»? Las referencias que contiene se perderán (las fuentes en sí se conservan).",
    deleteFailed: "Error al eliminar. Inténtalo de nuevo.",

    // ── BookmarkButton ──
    bookmarkSaved: "Guardado",
    bookmarkSave: "Guardar",
    bookmarkAddedAnnounce: "Añadido a guardados",
    bookmarkRemovedAnnounce: "Quitado de guardados",

    // ── AddToListMenu ──
    addToList: "Añadir a la lista de lectura",
    addToListMenuLabel: "Añadir a la lista de lectura",
    noListsYet: "Aún no hay listas de lectura.",
    newListItem: "Nueva lista…",
    newListNameSr: "Nombre de la nueva lista de lectura",
    newListPlaceholder: "Nombre de la lista",
    createAndAdd: "Crear y añadir",
    enterName: "Introduce un nombre.",
    addFailed: "No se ha podido añadir.",
    createListFailed: "No se ha podido crear la lista.",
    createdNotAdded: "Creada, pero no añadida.",
    addedToList: "Añadido a {name}",
    added: "Añadido",
  },
} as const satisfies ScholarNamespace;
