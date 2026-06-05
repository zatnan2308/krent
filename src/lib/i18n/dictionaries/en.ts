/** Эталонный словарь UI. Тип Dictionary выводится из него. */
export const en = {
  common: {
    signIn: "Sign in",
    openDashboard: "Open dashboard",
    backToHome: "Back to home",
    language: "Language",
    currency: "Currency",
  },
  nav: {
    properties: "Properties",
    rentals: "Rentals",
    about: "About",
    contact: "Contact",
  },
  home: {
    badge: "Real estate platform",
    title: "The white-label platform for agencies and realtors",
    subtitle:
      "Property sales, long-term and short-term rentals, direct booking, CRM and marketing on one multi-tenant foundation.",
  },
  footer: {
    rights: "All rights reserved.",
  },
  auth: {
    backToSite: "Back to site",
    tagline: "Licensed Realtor",
    tabSignIn: "Sign in",
    tabRegister: "Create account",
    show: "Show",
    hide: "Hide",
    signin: {
      eyebrow: "Welcome back",
      title: "Your Dubai\nportfolio awaits.",
      footerPrompt: "New to",
      footerAction: "Create one",
      submit: "Sign in",
      submitting: "Signing in…",
    },
    register: {
      eyebrow: "Create account",
      title: "Find your place\nin Dubai.",
      footerPrompt: "Already have an account?",
      footerAction: "Sign in",
      submit: "Create account",
      submitting: "Creating account…",
    },
    forgot: {
      eyebrow: "Account access",
      title: "Let's get you\nback in.",
      heading: "Reset your password",
      blurb: "Enter your email — we'll send a secure reset link.",
      submit: "Send reset link",
      submitting: "Sending…",
      backToSignIn: "Back to sign in",
    },
    reset: {
      eyebrow: "Account access",
      title: "Choose a new\npassword.",
      heading: "Set a new password",
      blurb: "Enter your new password — you'll be signed in afterwards.",
      submit: "Set new password",
      submitting: "Saving…",
    },
    fields: {
      fullName: "Full name",
      fullNamePlaceholder: "Your name",
      email: "Email",
      emailPlaceholder: "you@example.com",
      phone: "Phone",
      password: "Password",
      yourPassword: "Your password",
      createPassword: "Create a password",
      newPassword: "New password",
      newPasswordPlaceholder: "At least 8 characters",
      confirmPassword: "Confirm new password",
      confirmPasswordPlaceholder: "Repeat your password",
    },
    login: {
      confirmed: "Email confirmed. Please sign in.",
      passwordReset: "Password updated. Sign in with your new password.",
      rememberMe: "Remember me",
      forgotPassword: "Forgot password?",
    },
    signup: {
      agreePrefix: "I agree to the",
      terms: "Terms",
      and: "and",
      privacy: "Privacy Policy",
    },
  },
};

export type Dictionary = typeof en;

/** Глубоко-частичный словарь: перевод локали может быть НЕполным —
 *  недостающие ключи берутся из английского (см. getDictionary / mergeDict).
 *  Это позволяет наполнять ru/uk/fr/de постепенно, не ломая typecheck. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
