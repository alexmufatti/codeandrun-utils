import type { Locale } from "@/lib/i18n/translations";

// Bump when the policy text changes in a way users must re-accept:
// every non-admin user is sent back to /consent until they accept this version.
export const PRIVACY_POLICY_VERSION = "2026-10-13";

export type PrivacySection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  after?: string[]; // paragraphs rendered below the list
};

// `{controller}` and `{email}` are filled in from PRIVACY_CONTROLLER_NAME and
// PRIVACY_CONTACT_EMAIL by app/privacy/page.tsx.
export const privacyPolicy: Record<
  Locale,
  { title: string; updated: string; intro: string; sections: PrivacySection[] }
> = {
  it: {
    title: "Informativa sulla privacy",
    updated: "Ultimo aggiornamento",
    intro:
      "Questa pagina spiega quali dati personali tratta CodeAndRun Apps, perché, e come puoi controllarli.",
    sections: [
      {
        title: "1. Titolare del trattamento",
        paragraphs: [
          "Il titolare del trattamento è {controller}. Per qualsiasi richiesta sui tuoi dati scrivi a {email}.",
        ],
      },
      {
        title: "2. Dati trattati",
        items: [
          "Dati dell'account Google usato per accedere: nome, indirizzo email, immagine del profilo.",
          "Dati che inserisci tu: peso corporeo e peso obiettivo, abitudini e relativi check-in, eventi, record personali, impostazioni per zone di allenamento e frequenza cardiaca.",
          "Dati Strava, solo se colleghi il tuo account: profilo atleta (nome, id), attività e relative statistiche, token di accesso necessari alla sincronizzazione.",
          "Indirizzi email che indichi come destinatari del report periodico.",
          "Dati tecnici: cookie di sessione e log del server.",
        ],
      },
      {
        title: "3. Dati relativi alla salute",
        paragraphs: [
          "Il peso corporeo e i dati di frequenza cardiaca possono rivelare informazioni sullo stato di salute e rientrano tra le categorie particolari di dati (art. 9 GDPR). Vengono trattati solo sulla base del tuo consenso esplicito, che ti viene chiesto prima di usare l'applicazione.",
          "Puoi revocare il consenso in ogni momento eliminando il tuo account: la revoca non pregiudica la liceità del trattamento precedente.",
        ],
      },
      {
        title: "4. Finalità e base giuridica",
        items: [
          "Fornirti le funzioni dell'applicazione (storico del peso, abitudini, statistiche di corsa, calcolatori): esecuzione del servizio che hai richiesto e, per i dati relativi alla salute, il tuo consenso esplicito.",
          "Inviarti il report periodico via email: solo se lo attivi nelle impostazioni.",
          "Approvare le richieste di accesso e garantire la sicurezza del servizio: legittimo interesse del titolare.",
        ],
        after: [
          "I tuoi dati non vengono venduti, non vengono usati per pubblicità o profilazione e non sono visibili agli altri utenti.",
        ],
      },
      {
        title: "5. Dati Strava",
        paragraphs: [
          "I dati ricevuti da Strava vengono usati solo per mostrarti le tue statistiche e i tuoi riepiloghi. Non vengono mostrati ad altri utenti né ceduti a terzi.",
          "Puoi scollegare Strava dalle impostazioni. Eliminando l'account, l'autorizzazione su Strava viene revocata e le attività salvate vengono cancellate.",
        ],
      },
      {
        title: "6. Fornitori che trattano i dati",
        paragraphs: [
          "Per erogare il servizio il titolare si avvale di fornitori esterni, che trattano i dati per suo conto:",
        ],
        items: [
          "Google: autenticazione dell'account.",
          "Strava: fonte dei dati di attività, se colleghi l'account.",
          "MongoDB Atlas: database.",
          "Fornitore di posta elettronica: invio dei report e delle notifiche.",
          "Fornitore di hosting: server su cui gira l'applicazione.",
        ],
      },
      {
        title: "7. Conservazione",
        paragraphs: [
          "I dati vengono conservati finché il tuo account esiste. Quando elimini l'account, tutti i dati associati vengono cancellati. Le copie di backup vengono sovrascritte secondo il normale ciclo di rotazione.",
        ],
      },
      {
        title: "8. I tuoi diritti",
        paragraphs: [
          "Hai diritto di accedere ai tuoi dati, rettificarli, cancellarli, limitarne od opporti al trattamento, riceverli in formato portabile e revocare il consenso. In pratica:",
        ],
        items: [
          "Esportazione: da Impostazioni → Esporta i tuoi dati scarichi tutti i tuoi dati in formato JSON.",
          "Cancellazione: da Impostazioni → Elimina account cancelli definitivamente account e dati.",
          "Per ogni altra richiesta scrivi a {email}.",
        ],
      },
      {
        title: "9. Reclami",
        paragraphs: [
          "Se ritieni che il trattamento violi la normativa, puoi proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).",
        ],
      },
      {
        title: "10. Cookie e statistiche",
        paragraphs: [
          "L'applicazione usa un cookie tecnico di sessione, necessario per mantenere l'accesso, e salva nel browser le preferenze di lingua e tema. Le visite vengono conteggiate con uno strumento di statistiche gestito dal titolare. Non vengono usati cookie pubblicitari.",
        ],
      },
      {
        title: "11. Modifiche",
        paragraphs: [
          "Se questa informativa cambia in modo sostanziale, ti verrà chiesto di accettare la nuova versione al successivo accesso.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy policy",
    updated: "Last updated",
    intro:
      "This page explains which personal data CodeAndRun Apps processes, why, and how you can control it.",
    sections: [
      {
        title: "1. Data controller",
        paragraphs: [
          "The data controller is {controller}. For any request about your data, write to {email}.",
        ],
      },
      {
        title: "2. Data we process",
        items: [
          "Data from the Google account you sign in with: name, email address, profile picture.",
          "Data you enter: body weight and target weight, habits and their check-ins, events, personal records, settings for training and heart rate zones.",
          "Strava data, only if you connect your account: athlete profile (name, id), activities and their statistics, access tokens needed for syncing.",
          "Email addresses you set as recipients of the periodic report.",
          "Technical data: session cookie and server logs.",
        ],
      },
      {
        title: "3. Health-related data",
        paragraphs: [
          "Body weight and heart rate data can reveal information about your health and are a special category of data (GDPR art. 9). They are processed only on the basis of your explicit consent, which is requested before you use the application.",
          "You can withdraw consent at any time by deleting your account: withdrawal does not affect the lawfulness of earlier processing.",
        ],
      },
      {
        title: "4. Purposes and legal basis",
        items: [
          "Providing the application's features (weight history, habits, running statistics, calculators): performance of the service you requested and, for health-related data, your explicit consent.",
          "Sending you the periodic email report: only if you enable it in the settings.",
          "Approving access requests and keeping the service secure: legitimate interest of the controller.",
        ],
        after: [
          "Your data is not sold, is not used for advertising or profiling, and is not visible to other users.",
        ],
      },
      {
        title: "5. Strava data",
        paragraphs: [
          "Data received from Strava is used only to show you your own statistics and summaries. It is not shown to other users or passed to third parties.",
          "You can disconnect Strava from the settings. Deleting your account revokes the Strava authorization and deletes the stored activities.",
        ],
      },
      {
        title: "6. Providers that process data",
        paragraphs: [
          "To run the service the controller relies on external providers, which process data on its behalf:",
        ],
        items: [
          "Google: account authentication.",
          "Strava: source of activity data, if you connect your account.",
          "MongoDB Atlas: database.",
          "Email provider: delivery of reports and notifications.",
          "Hosting provider: server running the application.",
        ],
      },
      {
        title: "7. Retention",
        paragraphs: [
          "Data is kept for as long as your account exists. When you delete your account, all associated data is deleted. Backup copies are overwritten following the normal rotation cycle.",
        ],
      },
      {
        title: "8. Your rights",
        paragraphs: [
          "You have the right to access, rectify and erase your data, to restrict or object to processing, to receive your data in a portable format and to withdraw consent. In practice:",
        ],
        items: [
          "Export: Settings → Export your data downloads all your data as JSON.",
          "Deletion: Settings → Delete account permanently deletes your account and data.",
          "For any other request, write to {email}.",
        ],
      },
      {
        title: "9. Complaints",
        paragraphs: [
          "If you believe the processing breaches the law, you can lodge a complaint with the Italian data protection authority, Garante per la protezione dei dati personali (www.garanteprivacy.it).",
        ],
      },
      {
        title: "10. Cookies and statistics",
        paragraphs: [
          "The application uses a technical session cookie, needed to keep you signed in, and stores language and theme preferences in the browser. Visits are counted with a statistics tool run by the controller. No advertising cookies are used.",
        ],
      },
      {
        title: "11. Changes",
        paragraphs: [
          "If this policy changes substantially, you will be asked to accept the new version the next time you sign in.",
        ],
      },
    ],
  },
};
