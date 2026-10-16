import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useStudents } from "../hooks/use-students";
import { storage } from "../lib/storage";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  ArrowRight,
  CalendarDays,
  Gamepad2,
  Medal,
  Play,
  Puzzle,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { getBrandProfile, loadBrandProfileId, subscribeToBrandChange } from "../lib/branding";

type ActivityItem = {
  id: string;
  timestamp: number;
  icon: "puzzle" | "game";
  text: string;
  detail: string;
};

export default function Home() {
  const { students } = useStudents();
  const [brandId, setBrandId] = useState(() => loadBrandProfileId());
  const brand = getBrandProfile(brandId);
  useEffect(() => subscribeToBrandChange(() => setBrandId(loadBrandProfileId())), []);

  const topSolvers = storage.getTopSolvers(5);

  const dashboard = useMemo(() => {
    const attempts = storage.getAttempts();
    const studentById = new Map(students.map((student) => [student.id, student]));

    const puzzleActivity: ActivityItem[] = attempts.map((attempt) => {
      const student = studentById.get(attempt.studentId);
      return {
        id: `puzzle-${attempt.id}`,
        timestamp: attempt.timestamp,
        icon: "puzzle",
        text: `${student?.displayName ?? "A club member"} ${attempt.correct ? "solved" : "attempted"} a ${attempt.theme} puzzle`,
        detail: attempt.correct ? `+${attempt.score} pts` : "Practice",
      };
    });

    const gameActivity: ActivityItem[] = students.flatMap((student) =>
      storage.listGameRecords(student.id).map((game) => ({
        id: `game-${game.id}`,
        timestamp: Date.parse(game.date) || student.lastActive,
        icon: "game" as const,
        text: `${student.displayName} completed a game`,
        detail: game.result === "*" ? `${game.moveCount} moves` : game.result,
      })),
    );

    const recentActivity = [...puzzleActivity, ...gameActivity]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 4);

    const activeStudents = students.filter((student) => student.active !== false);
    const gamesPlayed = activeStudents.reduce((sum, student) => sum + student.gamesPlayed, 0);
    const puzzlesSolved = activeStudents.reduce((sum, student) => sum + student.puzzlesCorrect, 0);
    const averageLevel = activeStudents.length
      ? activeStudents.reduce((sum, student) => sum + student.currentLevel, 0) / activeStudents.length
      : 0;

    return {
      recentActivity,
      members: activeStudents.length,
      gamesPlayed,
      puzzlesSolved,
      averageLevel,
    };
  }, [students]);

  return (
    <div className="flex-1 bg-background">
      <section className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative min-h-[430px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_40%,hsl(var(--secondary)/0.16),transparent_35%)]" />
            <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(120deg,transparent_0%,transparent_54%,hsl(var(--secondary)/0.08)_54%,transparent_72%)]" />

            <div className="relative z-10 grid min-h-[430px] lg:grid-cols-[1.05fr_.95fr]">
              <div className="flex flex-col justify-center p-7 md:p-10 lg:p-12">
                <div className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.32em] text-secondary">
                  <span className="h-px w-10 bg-secondary" />
                  Welcome to
                </div>

                <h1 className="font-serif text-4xl font-black uppercase leading-[0.96] tracking-tight md:text-5xl lg:text-6xl">
                  <span className="block text-foreground">{brand.schoolName.replace(" High School", "")}</span>
                  <span className="mt-2 block text-secondary">{brand.clubName}</span>
                </h1>

                <div className="my-6 h-1 w-16 rounded-full bg-secondary" />

                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Sharpen Your Game.</h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
                  Build your skills, compete with teammates, and represent {brand.schoolName} with pride.
                  Excellence on the board builds champions in the classroom and in life.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button size="lg" className="h-12 bg-secondary px-7 text-secondary-foreground hover:bg-secondary/90" asChild>
                    <Link href="/play">
                      <Play className="mr-2 h-5 w-5 fill-current" />
                      Play Now
                      <ArrowRight className="ml-3 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 border-border bg-card/50 px-7 hover:bg-accent" asChild>
                    <Link href="/puzzles">
                      <Puzzle className="mr-2 h-5 w-5" />
                      Solve Puzzles
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="relative hidden items-end justify-center lg:flex">
                <div className="absolute bottom-0 right-0 h-[88%] w-[90%] rounded-tl-[48%] bg-gradient-to-t from-secondary/10 to-transparent" />
                <img
                  src={brand.logoUrl}
                  alt={brand.logoAlt}
                  className="relative z-10 mb-6 max-h-[370px] w-[88%] object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </motion.div>

          <Card className="border-border bg-card shadow-lg">
            <CardHeader className="border-b border-border/70 pb-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-wide text-secondary">
                  <Trophy className="h-5 w-5" />
                  Top Solvers
                </CardTitle>
                <span className="text-xs text-muted-foreground">Puzzle score</span>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {topSolvers.length > 0 ? (
                <div className="divide-y divide-border/70">
                  {topSolvers.map((student, index) => (
                    <div key={student.id} className="flex items-center gap-3 py-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-black ${
                        index === 0
                          ? "border-secondary bg-secondary text-secondary-foreground"
                          : "border-border bg-muted text-muted-foreground"
                      }`}>
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{student.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.puzzlesCorrect} solved · Level {student.currentLevel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-secondary">{student.puzzleScore}</div>
                        <div className="text-[11px] text-muted-foreground">pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-56 flex-col items-center justify-center text-center text-muted-foreground">
                  <Trophy className="mb-3 h-10 w-10 text-secondary/70" />
                  <p className="font-medium text-foreground">No puzzle scores yet</p>
                  <p className="mt-1 text-sm">Scores will appear after students solve puzzles.</p>
                </div>
              )}

              <Button variant="outline" className="mt-4 w-full border-secondary/40 text-secondary hover:bg-secondary/10" asChild>
                <Link href="/roster">
                  View Full Roster <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <FeatureCard
            href="/play"
            icon={<Gamepad2 className="h-7 w-7" />}
            title="Free Play"
            description="Play a complete game with move validation, clocks, and game review."
            cta="Start Playing"
          />
          <FeatureCard
            href="/puzzles"
            icon={<Puzzle className="h-7 w-7" />}
            title="Tactics Trainer"
            description="Build pattern recognition and calculation with targeted chess puzzles."
            cta="Start Training"
          />
          <FeatureCard
            href="/roster"
            icon={<Users className="h-7 w-7" />}
            title="Club Roster"
            description="View club members, puzzle progress, games, and participation."
            cta="View Roster"
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base uppercase tracking-wide text-secondary">Recent Club Activity</CardTitle>
              <CardDescription>Generated from real puzzle and game records.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.recentActivity.length > 0 ? (
                <div className="divide-y divide-border/70">
                  {dashboard.recentActivity.map((item) => (
                    <div key={item.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md border border-secondary/30 bg-secondary/10 text-secondary">
                        {item.icon === "puzzle" ? <Puzzle className="h-4 w-4" /> : <Gamepad2 className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.text}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-secondary">{item.detail}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-9 text-center text-sm text-muted-foreground">
                  Club activity will appear here as games and puzzles are completed.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base uppercase tracking-wide text-secondary">Club Stats</CardTitle>
              <CardDescription>Live totals from the current club data.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 divide-x divide-y divide-border/70 sm:grid-cols-4 sm:divide-y-0">
                <Stat icon={<Users />} value={dashboard.members} label="Members" />
                <Stat icon={<Target />} value={dashboard.averageLevel.toFixed(1)} label="Avg. Level" />
                <Stat icon={<Medal />} value={dashboard.puzzlesSolved.toLocaleString()} label="Puzzles Solved" />
                <Stat icon={<CalendarDays />} value={dashboard.gamesPlayed.toLocaleString()} label="Games Played" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  href,
  icon,
  title,
  description,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full cursor-pointer border-border bg-card transition duration-200 hover:-translate-y-1 hover:border-secondary/60 hover:shadow-lg">
        <CardContent className="p-6">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-secondary/35 bg-secondary/10 text-secondary">
            {icon}
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-secondary">
            {cta} <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center p-4 text-center">
      <div className="mb-2 text-secondary [&>svg]:h-5 [&>svg]:w-5">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
