export type BrandProfileId = "falcons" | "owls";

export interface BrandProfile {
  id: BrandProfileId;
  label: string;
  schoolName: string;
  clubName: string;
  mascot: string;
  logoUrl: string;
  logoAlt: string;
  footerText: string;
  documentTitle: string;
  colors: {
    background: string;
    foreground: string;
    border: string;
    card: string;
    cardForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    ring: string;
  };
}

export const BRAND_PROFILES: Record<BrandProfileId, BrandProfile> = {
  falcons: {
    id: "falcons",
    label: "Ogemaw Heights Falcons",
    schoolName: "Ogemaw Heights High School",
    clubName: "Falcons Chess Club",
    mascot: "Falcons",
    logoUrl: `${import.meta.env.BASE_URL}assets/ohhs-falcon-chess-logo.png`,
    logoAlt: "Ogemaw Heights Falcons Chess Club",
    footerText: "Falcons Chess Club",
    documentTitle: "Falcons Chess Club",
    colors: {
      background: "42 34% 96%",
      foreground: "24 38% 12%",
      border: "38 24% 80%",
      card: "42 40% 99%",
      cardForeground: "24 38% 12%",
      primary: "24 47% 20%",
      primaryForeground: "45 100% 92%",
      secondary: "44 94% 52%",
      secondaryForeground: "24 47% 16%",
      muted: "40 28% 90%",
      mutedForeground: "24 20% 38%",
      accent: "44 75% 91%",
      accentForeground: "24 47% 18%",
      ring: "44 94% 45%",
    },
  },
  owls: {
    id: "owls",
    label: "Oscoda Owls",
    schoolName: "Oscoda Area Schools",
    clubName: "Owls Chess Club",
    mascot: "Owls",
    logoUrl: `${import.meta.env.BASE_URL}assets/ohs-chess-logo.png`,
    logoAlt: "Owls Chess Club",
    footerText: "Owls Chess Club",
    documentTitle: "Owls Chess Club",
    colors: {
      background: "40 30% 95%",
      foreground: "220 50% 10%",
      border: "40 15% 85%",
      card: "40 25% 98%",
      cardForeground: "220 50% 10%",
      primary: "220 80% 30%",
      primaryForeground: "0 0% 100%",
      secondary: "210 10% 80%",
      secondaryForeground: "220 50% 15%",
      muted: "40 20% 90%",
      mutedForeground: "220 20% 40%",
      accent: "40 40% 92%",
      accentForeground: "220 50% 15%",
      ring: "220 80% 30%",
    },
  },
};

export function getBrandProfile(id?: string): BrandProfile {
  return BRAND_PROFILES[id === "owls" ? "owls" : "falcons"];
}

export function applyBrandProfile(profile: BrandProfile): void {
  const root = document.documentElement;
  root.dataset.brand = profile.id;

  const vars: Record<string, string> = {
    "--background": profile.colors.background,
    "--foreground": profile.colors.foreground,
    "--border": profile.colors.border,
    "--card": profile.colors.card,
    "--card-foreground": profile.colors.cardForeground,
    "--card-border": profile.colors.border,
    "--popover": profile.colors.card,
    "--popover-foreground": profile.colors.cardForeground,
    "--popover-border": profile.colors.border,
    "--primary": profile.colors.primary,
    "--primary-foreground": profile.colors.primaryForeground,
    "--secondary": profile.colors.secondary,
    "--secondary-foreground": profile.colors.secondaryForeground,
    "--muted": profile.colors.muted,
    "--muted-foreground": profile.colors.mutedForeground,
    "--accent": profile.colors.accent,
    "--accent-foreground": profile.colors.accentForeground,
    "--input": profile.colors.border,
    "--ring": profile.colors.ring,
    "--chart-1": profile.colors.primary,
    "--chart-2": profile.colors.secondary,
  };

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }

  document.title = profile.documentTitle;
}
