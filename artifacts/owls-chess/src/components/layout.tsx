import { Link, useLocation } from "wouter";
import { useStudents } from "../hooks/use-students";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import logo from "../assets/logo.png";
import { BookOpen, Users, Play } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { students, activeStudentId, setActiveStudent } = useStudents();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group transition-transform hover:scale-[1.02]">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 border border-primary/20 flex items-center justify-center">
                <img src={logo} alt="Owls Chess Club" className="w-full h-full object-cover" />
              </div>
              <span className="font-serif font-bold text-xl tracking-tight text-primary">
                Owls Chess
              </span>
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
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
      
      <footer className="border-t border-border bg-card py-8 mt-auto">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <p>Owls Chess Club &copy; {new Date().getFullYear()}. Academic excellence through chess.</p>
          <p className="mt-1 opacity-70">Custom owl pieces coming soon.</p>
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
