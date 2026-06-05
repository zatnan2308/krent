import type { DeepPartial, Dictionary } from "./en";

/** Немецкий словарь UI. Может быть частичным — недостающее берётся из en. */
export const de: DeepPartial<Dictionary> = {
  common: {
    signIn: "Anmelden",
    openDashboard: "Dashboard öffnen",
    backToHome: "Zurück zur Startseite",
    language: "Sprache",
    currency: "Währung",
  },
  nav: {
    properties: "Immobilien",
    rentals: "Vermietungen",
    about: "Über uns",
    contact: "Kontakt",
  },
  home: {
    badge: "Immobilienplattform",
    title: "Die White-Label-Plattform für Agenturen und Makler",
    subtitle:
      "Immobilienverkauf, Lang- und Kurzzeitvermietung, Direktbuchung, CRM und Marketing auf einer mandantenfähigen Basis.",
  },
  footer: {
    rights: "Alle Rechte vorbehalten.",
  },
  auth: {
    backToSite: "Zurück zur Website",
    tagline: "Lizenzierter Makler",
    tabSignIn: "Anmelden",
    tabRegister: "Konto erstellen",
    show: "Anzeigen",
    hide: "Verbergen",
    signin: {
      eyebrow: "Willkommen zurück",
      title: "Ihr Dubai-Portfolio\nwartet.",
      footerPrompt: "Neu bei",
      footerAction: "Konto erstellen",
      submit: "Anmelden",
      submitting: "Anmeldung…",
    },
    register: {
      eyebrow: "Konto erstellen",
      title: "Finden Sie Ihren Platz\nin Dubai.",
      footerPrompt: "Sie haben bereits ein Konto?",
      footerAction: "Anmelden",
      submit: "Konto erstellen",
      submitting: "Konto wird erstellt…",
    },
    forgot: {
      eyebrow: "Kontozugang",
      title: "Holen wir Sie\nzurück.",
      heading: "Passwort zurücksetzen",
      blurb: "Geben Sie Ihre E-Mail ein — wir senden einen sicheren Link.",
      submit: "Link senden",
      submitting: "Senden…",
      backToSignIn: "Zurück zur Anmeldung",
    },
    reset: {
      eyebrow: "Kontozugang",
      title: "Wählen Sie ein neues\nPasswort.",
      heading: "Neues Passwort festlegen",
      blurb: "Geben Sie Ihr neues Passwort ein — danach werden Sie angemeldet.",
      submit: "Passwort festlegen",
      submitting: "Speichern…",
    },
    fields: {
      fullName: "Vollständiger Name",
      fullNamePlaceholder: "Ihr Name",
      email: "E-Mail",
      emailPlaceholder: "you@example.com",
      phone: "Telefon",
      password: "Passwort",
      yourPassword: "Ihr Passwort",
      createPassword: "Passwort erstellen",
      newPassword: "Neues Passwort",
      newPasswordPlaceholder: "Mindestens 8 Zeichen",
      confirmPassword: "Passwort bestätigen",
      confirmPasswordPlaceholder: "Passwort wiederholen",
    },
    login: {
      confirmed: "E-Mail bestätigt. Bitte anmelden.",
      passwordReset: "Passwort aktualisiert. Mit dem neuen Passwort anmelden.",
      rememberMe: "Angemeldet bleiben",
      forgotPassword: "Passwort vergessen?",
    },
    signup: {
      agreePrefix: "Ich akzeptiere die",
      terms: "AGB",
      and: "und",
      privacy: "Datenschutzrichtlinie",
    },
  },
};
