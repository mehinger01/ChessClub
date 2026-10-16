import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useStudents } from "../hooks/use-students";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { BookOpen, Users, Play, Settings, Shield, Palette } from "lucide-react";
import {
  applyBrandProfile,
  getBrandProfile,
  loadBrandProfileId,
  saveBrandProfileId,
  subscribeToBrandChange,
  type BrandProfileId,
} from "../lib/branding";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { students, activeStudentId, setActiveStudent } = useStudents();
  const [brandId, setBrandId] = useState<BrandProfileId>(() => loadBrandProfileId());
  const brand = getBrandProfile(brandId);
  const isFalcon = brand.id === "falcons";

  useEffect(() => {
    applyBrandProfile(brand);
  }, [brand]);

  useEffect(() => subscribeToBrandChange(() => setBrandId(loadBrandProfileId())), []);

  const changeBrand = (value: string) => {
    const next = value === "owls" ? "owls" : "falcons";
    saveBrandProfileId(next);
    setBrandId(next);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className={`sticky top-0 z-50 border-b border-border backdrop-blur-md ${isFalcon ? "bg-background/95" : "bg-card/90"}`}>
        <div className="container mx-auto max-w-7xl px-4 min-h-20 flex items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" className="flex min-w-0 items-center gap-3 group">
              <img
                src={brand.logoUrl}
                alt={brand.logoAlt}
                className="h-14 w-14 shrink-0 object-contain transition-transform group-hover:scale-105"
              />
              <div className="hidden sm:block min-w-0 leading-none">
                <div className={`truncate font-serif text-lg font-black uppercase tracking-[0.08em] ${isFalcon ? "text-secondary" : "text-primary"}`}>
                  {brand.schoolName.replace(" High School", "")}
                </div>
                <div className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.32em] text-muted-foreground">
                  {brand.clubName}
                </div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-stretch self-stretch">
              <NavButton href="/play" active={location === "/play"} icon={<Play className="h-4 w-4" />} falcon={isFalcon}>
                Free Play
              </NavButton>
              <NavButton href="/puzzles" active={location === "/puzzles"} icon={<BookOpen className="h-4 w-4" />} falcon={isFalcon}>
                Puzzles
              </NavButton>
              <NavButton href="/roster" active={location === "/roster"} icon={<Users className="h-4 w-4" />} falcon={isFalcon}>
                Roster
              </NavButton>
              <NavButton href="/admin" active={location === "/admin"} icon={<Shield className="h-4 w-4" />} falcon={isFalcon}>
                Admin
              </NavButton>
              <NavButton href="/settings" active={location === "/settings"} icon={<Settings className="h-4 w-4" />} falcon={isFalcon}>
                Settings
              </NavButton>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden w-48 md:block">
              <Select value={activeStudentId || "none"} onValueChange={(v) => setActiveStudent(v === "none" ? null : v)}>
                <SelectTrigger className="border-border bg-card/60">
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No student selected</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>{student.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <nav className="lg:hidden flex items-center gap-1">
              <Button variant="ghost" size="icon" asChild><Link href="/play" aria-label="Free Play"><Play className="h-5 w-5" /></Link></Button>
              <Button variant="ghost" size="icon" asChild><Link href="/puzzles" aria-label="Puzzles"><BookOpen className="h-5 w-5" /></Link></Button>
              <Button variant="ghost" size="icon" asChild><Link href="/admin" aria-label="Admin"><Shield className="h-5 w-5" /></Link></Button>
            </nav>
          </div>
        </div>
      </header>

      {location === "/admin" ? (
        <section className="border-b border-border bg-muted/30">
          <div className="container mx-auto max-w-5xl px-4 py-4">
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-secondary/10 p-2 text-secondary">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-serif font-semibold">School Branding</div>
                  <div className="text-sm text-muted-foreground">
                    Switch the complete site identity. The Oscoda Owls brand remains preserved and can be restored at any time.
                  </div>
                </div>
              </div>
              <div className="w-full md:w-72 shrink-0">
                <Select value={brandId} onValueChange={changeBrand}>
                  <SelectTrigger aria-label="Active school branding">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="falcons">Ogemaw Heights Falcons</SelectItem>
                    <SelectItem value="owls">Oscoda Owls — Legacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className={`border-t border-border py-7 mt-auto ${isFalcon ? "bg-card" : "bg-card"}`}>
        <div className="container mx-auto max-w-7xl px-4 flex flex-col gap-2 text-center md:flex-row md:items-center md:justify-between md:text-left">
          <div>
            <div className={`font-serif font-bold ${isFalcon ? "text-secondary" : "text-primary"}`}>{brand.schoolName}</div>
            <div className="text-xs text-muted-foreground">{brand.footerText} · Academic excellence through chess.</div>
          </div>
          <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} {brand.clubName}</div>
        </div>
      </footer>
    </div>
  );
}

function NavButton({
  href,
  active,
  children,
  icon,
  falcon,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
  falcon: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2 px-4 text-sm font-medium transition-colors ${
        active
          ? falcon
            ? "text-secondary"
            : "text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
      {active ? <span className={`absolute inset-x-3 bottom-0 h-0.5 ${falcon ? "bg-secondary" : "bg-primary"}`} /> : null}
    </Link>
  );
}
