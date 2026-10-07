/*
 * Toutes les sollicitations de la matinée. Chaque entrée : où elle apparaît (surface), qui l'envoie, le texte,
 * et les réponses possibles — une seule est la bonne (marquée ✓ par `true`). L'ordre des boutons est mélangé au tirage.
 *
 * surfaces : code (notifications VS Code) · slack (fil d'activité Slack) · toast (notifications Windows : Outlook, Teams, Jira)
 *            alert (bandeau d'astreinte) · phone (écran verrouillé du téléphone)
 */

export const PEOPLE = {
  julie: { name: 'Julie Martin', role: 'Product Owner', color: '#e8912d', initials: 'JM' },
  marc: { name: 'Marc Lefèvre', role: 'Manager', color: '#2eb67d', initials: 'ML' },
  karim: { name: 'Karim Benali', role: 'Dev back', color: '#36c5f0', initials: 'KB' },
  lea: { name: 'Léa Rousseau', role: 'Support client', color: '#e01e5a', initials: 'LR' },
  tom: { name: 'Tom (stagiaire)', role: 'Stagiaire', color: '#ecb22e', initials: 'TO' },
  cto: { name: 'Sophie Garnier', role: 'CTO', color: '#7c3aed', initials: 'SG' },
  bot: { name: 'Deploy Bot', role: 'APP', color: '#4a154b', initials: '🤖' },
  jira: { name: 'Jira Cloud', role: 'APP', color: '#0052cc', initials: 'J' },
};

export const TEMPLATES = [
  // ------------------------------------------------------------------ VS Code
  { surf: 'code', level: 'error', text: 'Le build a échoué : 3 erreurs dans src/api/clients.ts', actions: [['Afficher les erreurs', true], ['Ignorer', false]] },
  { surf: 'code', level: 'warn', text: 'Conflit de fusion dans package-lock.json (412 lignes)', actions: [['Résoudre le conflit', true], ['git push --force', false]] },
  { surf: 'code', level: 'info', text: 'Prettier : 214 fichiers ne sont pas formatés.', actions: [['Formater', true], ['Désinstaller Prettier', false]] },
  { surf: 'code', level: 'info', text: 'Votre branche a 37 commits de retard sur origin/main.', actions: [['Pull', true], ['Push --force', false]] },
  { surf: 'code', level: 'error', text: 'Tests : 12 échecs dans auth.spec.ts', actions: [['Déboguer', true], ['Supprimer les tests', false]] },
  { surf: 'code', level: 'info', text: 'Une mise à jour de VS Code est prête. Redémarrer maintenant ?', actions: [['Plus tard', true], ['Redémarrer maintenant', false]] },
  { surf: 'code', level: 'info', text: 'Copilot propose 400 lignes de code. Tout accepter ?', actions: [['Relire d\'abord', true], ['Tout accepter', false]] },
  { surf: 'code', level: 'warn', text: 'TypeScript : « any » utilisé 58 fois dans le projet.', actions: [['Typer correctement', true], ['// @ts-ignore partout', false]] },
  { surf: 'code', level: 'error', text: 'Le terminal « npm run dev » s\'est arrêté (code 137 : mémoire saturée).', actions: [['Relancer', true], ['Fermer VS Code', false]] },
  { surf: 'code', level: 'warn', text: 'Fichier .env sur le point d\'être commité (contient des secrets).', actions: [['Retirer du commit', true], ['Commiter quand même', false]] },

  // ------------------------------------------------------------------ Slack
  { surf: 'slack', who: 'julie', where: 'Message direct', text: 'Tu peux jeter un œil à ma PR avant midi ? 🙏', actions: [['👀 Je regarde', true], ['Laisser en vu', false]] },
  { surf: 'slack', who: 'marc', where: '#général', text: '@channel Quelqu\'un a cassé la prod ?? Les clients appellent 😡', actions: [['🔍 J\'investigue', true], ['Réagir 🙈', false]] },
  { surf: 'slack', who: 'karim', where: 'Message direct', text: 'Café ? ☕ Je descends', actions: [['Pas maintenant, incident 😅', true], ['Go, j\'arrive !', false]] },
  { surf: 'slack', who: 'tom', where: '#random', text: 'Qui a laissé un yaourt dans le frigo depuis mars ?', actions: [['Ignorer (on a un incident)', true], ['Lancer un sondage', false]] },
  { surf: 'slack', who: 'cto', where: 'Message direct', text: 'Point rapide dans 2 min ? C\'est important.', actions: [['Oui, j\'arrive', true], ['Passer en « absent »', false]] },
  { surf: 'slack', who: 'bot', where: '#deploys', text: 'Déploiement v2.14.0 en prod demandé par Tom (stagiaire). Approuver ?', actions: [['Refuser et vérifier', true], ['Approuver', false]] },
  { surf: 'slack', who: 'lea', where: '#support', text: 'Le client Durand dit que « plus rien ne marche » 😬', actions: [['Ouvrir un ticket', true], ['« Videz votre cache »', false]] },
  { surf: 'slack', who: 'tom', where: 'Message direct', text: 'J\'ai lancé `rm -rf /` sur le serveur de staging, c\'est grave ? 😅', actions: [['📞 Appeler Tom', true], ['Réagir 👍', false]] },
  { surf: 'slack', who: 'julie', where: '#produit', text: 'Le client veut le bouton « un peu plus bleu mais pas trop »', actions: [['Demander la couleur exacte', true], ['Tout repasser en rouge', false]] },
  { surf: 'slack', who: 'marc', where: 'Message direct', text: 'Tu peux remplir ton CRA de la semaine dernière ?', actions: [['Ce soir, promis', true], ['Démissionner', false]] },
  { surf: 'slack', who: 'jira', where: '#incidents', text: 'PROJ-4821 « Le bouton Payer ne fait rien » vous a été assigné (Bloquant).', actions: [['Passer en cours', true], ['Réassigner au stagiaire', false]] },
  { surf: 'slack', who: 'karim', where: '#back', text: 'La migration de la base a planté à 47 %… on fait quoi ?', actions: [['Rollback', true], ['On relance, ça passera', false]] },

  // ------------------------------------------------------------------ notifications Windows (Outlook, Teams, Jira)
  { surf: 'toast', app: 'Outlook', icon: 'outlook', title: 'Service Informatique', text: 'Votre mot de passe expire ! Cliquez ici : micr0soft-secure-login.ru', actions: [['Signaler (hameçonnage)', true], ['Cliquer sur le lien', false]] },
  { surf: 'toast', app: 'Outlook', icon: 'outlook', title: 'Invitation : Rétro de sprint', text: 'Aujourd\'hui 14:00 – 15:00 · Salle Kiwi', actions: [['Accepter', true], ['Refuser', false]] },
  { surf: 'toast', app: 'Outlook', icon: 'outlook', title: 'Fournisseur Infra', text: 'Facture_octobre.pdf.exe (pièce jointe)', actions: [['Supprimer', true], ['Ouvrir la pièce jointe', false]] },
  { surf: 'toast', app: 'Outlook', icon: 'outlook', title: 'Client Durand — URGENT', text: 'L\'export CSV est vide depuis ce matin. Merci de revenir vers nous.', actions: [['Répondre', true], ['Archiver', false]] },
  { surf: 'toast', app: 'Outlook', icon: 'outlook', title: 'Ressources humaines', text: 'Rappel : votre entretien annuel est à remplir (en retard de 3 mois).', actions: [['Programmer un rappel', true], ['Supprimer le mail', false]] },
  { surf: 'toast', app: 'Teams', icon: 'teams', call: true, title: 'Appel entrant', text: 'Client — Société Durand', actions: [['Décrocher', true], ['Refuser', false]] },
  { surf: 'toast', app: 'Teams', icon: 'teams', call: true, title: 'Appel entrant', text: 'Numéro inconnu (+33 9 74 …) · « Isolation à 1 € »', actions: [['Refuser', true], ['Décrocher', false]] },
  { surf: 'toast', app: 'Teams', icon: 'teams', call: true, title: 'Appel entrant', text: 'Marc Lefèvre (Manager)', actions: [['Décrocher', true], ['Refuser', false]] },
  { surf: 'toast', app: 'Jira', icon: 'jira', title: 'Fin du sprint aujourd\'hui', text: '14 tickets encore ouverts dans « Sprint 42 ».', actions: [['Prioriser', true], ['Tout fermer d\'un coup', false]] },
  { surf: 'toast', app: 'Windows Update', icon: 'windows', title: 'Redémarrage requis', text: 'Votre appareil va redémarrer dans 5 minutes pour installer des mises à jour.', actions: [['Reporter', true], ['Redémarrer maintenant', false]] },
  { surf: 'toast', app: 'Outlook', icon: 'outlook', title: 'Réunion dans 1 minute', text: 'Daily standup · Teams', actions: [['Rejoindre', true], ['Ignorer', false]] },

  // ------------------------------------------------------------------ astreinte (bandeau rouge)
  { surf: 'alert', sev: 'critical', title: 'api-clients : erreurs 503 sur 87 % des requêtes', text: 'Incident #1452 · déclenché il y a 12 s · prod-eu-west-1', actions: [['Prendre en charge', true], ['Reporter 1 h', false]] },
  { surf: 'alert', sev: 'critical', title: 'postgres-prod : disque plein à 98 %', text: 'Incident #1453 · db-main-01', actions: [['Prendre en charge', true], ['Reporter 1 h', false]] },
  { surf: 'alert', sev: 'high', title: 'Latence p99 > 4 s sur /checkout', text: 'Incident #1454 · paiements', actions: [['Prendre en charge', true], ['Ignorer', false]] },
  { surf: 'alert', sev: 'critical', title: 'Certificat SSL expiré : portail-client.fr', text: 'Incident #1455 · les clients voient « Connexion non sécurisée »', actions: [['Prendre en charge', true], ['Reporter 1 h', false]] },
  { surf: 'alert', sev: 'critical', title: 'Site client « Durand » : DOWN', text: 'Incident #1456 · 0/5 sondes OK depuis 2 min', actions: [['Prendre en charge', true], ['Reporter 1 h', false]] },

  // ------------------------------------------------------------------ téléphone
  { surf: 'phone', app: 'Messages', icon: 'sms', title: 'Maman', text: 'Tu rentres manger ce soir ? 😊', actions: [['Oui ❤️', true], ['Vu', false]] },
  { surf: 'phone', app: 'Messages', icon: 'sms', title: '38XXX', text: 'Votre code de vérification : 482 913. Ne le communiquez jamais.', actions: [['Ignorer', true], ['Le transférer au « support »', false]] },
  { surf: 'phone', app: 'Authenticator', icon: 'auth', title: 'Connexion à votre compte pro ?', text: 'Moscou, Russie · Chrome sur Windows', actions: [['Refuser', true], ['Approuver', false]] },
  { surf: 'phone', app: 'Uber Eats', icon: 'food', title: 'Votre livreur est arrivé', text: 'Il vous attend en bas avec vos ramens 🍜', actions: [['J\'arrive', true], ['Ignorer', false]] },
  { surf: 'phone', app: 'Batterie', icon: 'battery', title: 'Batterie faible', text: '5 % restants', actions: [['Brancher', true], ['Mode avion', false]] },
  { surf: 'phone', app: 'WhatsApp', icon: 'whatsapp', title: 'Bob (les potes)', text: 'T\'as vu le match hier soir ?? 😱⚽', actions: [['Plus tard', true], ['Débattre 20 min', false]] },
  { surf: 'phone', app: 'Calendrier', icon: 'cal', title: 'Dentiste — 18:30', text: 'Dans 9 heures. Ne pas oublier.', actions: [['OK', true], ['Annuler le rendez-vous', false]] },
  { surf: 'phone', app: 'Téléphone', icon: 'call', title: 'Appel manqué', text: 'Banque (3) — « opération suspecte »', actions: [['Appeler le n° officiel', true], ['Rappeler ce numéro', false]] },
];
