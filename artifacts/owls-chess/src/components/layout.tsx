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
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-[1.02]">
              <img
                src={brand.logoUrl}
                alt={brand.logoAlt}
                className="h-11 w-auto object-contain"
                style={{ maxWidth: "11rem" }}
              />
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <NavButton href="/play" active={location === "/play"} icon={<Play className="w-4 h-4 mr-2" />}>
                Free Play
              </NavButton>
              <NavButton href="/puzzles" active={location === "/puzzles"} icon={<BookOpen className="w-4 h-4 mr-2" />}>
                Puzzles
              </NavButton>
              <NavButton href="/roster" active={location === "/roster"} icon={<Users className="w-4 h-4 mr-2" />}>
                Roster
              </NavButton>
              <NavButton href="/admin" active={location === "/admin"} icon={<Shield className="w-4 h-4 mr-2" />}>
                Admin
              </NavButton>
              <NavButton href="/settings" active={location === "/settings"} icon={<Settings className="w-4 h-4 mr-2" />}>
                Settings
              </NavButton>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select value={activeStudentId || "none"} onValueChange={(v) => setActiveStudent(v === "none" ? null : v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No student selected</SelectItem>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <nav className="md:hidden flex items-center gap-2">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/play"><Play className="w-5 h-5 text-primary" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/puzzles"><BookOpen className="w-5 h-5 text-primary" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/roster"><Users className="w-5 h-5 text-primary" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/admin"><Shield className="w-5 h-5 text-primary" /></Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/settings"><Settings className="w-5 h-5 text-primary" /></Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {location === "/admin" && (
        <section className="border-b border-border bg-muted/30">
          <div className="container mx-auto max-w-5xl px-4 py-4">
            <div className="rounded-xl border border-border bg-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
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
      )}

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border bg-card py-8 mt-auto">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>{brand.footerText} &copy; {new Date().getFullYear()}. Academic excellence through chess.</p>
          <p className="mt-1 text-xs">{brand.schoolName}</p>
        </div>
      </footer>
    </div>
  );
}

function NavButton({ href, active, children, icon }: { href: string; active: boolean; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className={`font-medium ${active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}
      asChild
    >
      <Link href={href}>
        {icon}
        {children}
      </Link>
    </Button>
  );
}
