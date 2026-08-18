import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useStudents } from "../hooks/use-students";
import { storage } from "../lib/storage";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Play, BookOpen, Users, Trophy, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { getBrandProfile, loadBrandProfileId, subscribeToBrandChange } from "../lib/branding";

export default function Home() {
  const { students } = useStudents();
  const topSolvers = storage.getTopSolvers(3);
  const [brandId, setBrandId] = useState(() => loadBrandProfileId());
  const brand = getBrandProfile(brandId);

  useEffect(() => subscribeToBrandChange(() => setBrandId(loadBrandProfileId())), []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/50 to-primary pointer-events-none"></div>

        <div className="container mx-auto max-w-6xl px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1 text-center md:text-left"
            >
              <p className="text-sm md:text-base uppercase tracking-[0.25em] font-semibold text-secondary mb-4">
                {brand.schoolName}
              </p>
              <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-6 leading-tight">
                Master the <br/><span className="text-secondary">Royal Game</span>.
              </h1>
              <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto md:mx-0 font-sans leading-relaxed">
                Welcome to the {brand.clubName}. We combine academic rigor with fierce competition.
                Whether you're learning the rules or studying grandmaster tactics, your board awaits.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                <Button size="lg" className="w-full sm:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/90 text-lg px-8 h-14 rounded-xl shadow-lg transition-transform hover:-translate-y-1" asChild>
                  <Link href="/play">
                    <Play className="w-5 h-5 mr-2" /> Play Now
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 h-14 rounded-xl border-primary-foreground/20 hover:bg-primary-foreground/10 text-white" asChild>
                  <Link href="/puzzles">
                    <BookOpen className="w-5 h-5 mr-2" /> Solve Puzzles
                  </Link>
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex-1 w-full max-w-md md:max-w-full"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl border border-primary-foreground/20 bg-primary/50 p-5 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <img src={brand.logoUrl} alt={brand.logoAlt} className="w-full h-full object-contain rounded-xl bg-background" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Quick Links & Leaderboard */}
      <section className="py-20 bg-background flex-1">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 grid sm:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Link href="/play">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border/50 group bg-card">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-2xl font-serif">Free Play</CardTitle>
                      <CardDescription className="text-base mt-2">
                        Share a screen and play a standard game. Features full move validation and game analysis.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Link href="/puzzles">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border/50 group bg-card">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-2xl font-serif">Tactics Trainer</CardTitle>
                      <CardDescription className="text-base mt-2">
                        Sharpen your vision with curated puzzles from master games. Track your accuracy.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                <Link href="/roster">
                  <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border-border/50 group bg-card">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-2xl font-serif">Club Roster</CardTitle>
                      <CardDescription className="text-base mt-2">
                        Manage student profiles, view statistics, and track club participation over time.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
              <Card className="h-full bg-card border-border/50 flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-serif text-xl">
                    <Trophy className="w-5 h-5 text-primary" />
                    Top Solvers
                  </CardTitle>
                  <CardDescription>
                    Highest puzzle scores in the club
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {topSolvers.length > 0 ? (
                    <div className="space-y-4 flex-1">
                      {topSolvers.map((student, index) => (
                        <div key={student.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500' :
                              index === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400' :
                              'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-500'
                            }`}>
                              #{index + 1}
                            </div>
                            <div className="font-medium text-foreground">{student.displayName}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-primary">{student.puzzleScore} pts</div>
                            <div className="text-xs text-muted-foreground">{student.puzzlesCorrect} solved · L{student.currentLevel}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-8 opacity-60">
                      <BookOpen className="w-12 h-12 mb-3 text-muted-foreground" />
                      <p className="text-sm font-medium">No puzzles solved yet</p>
                      <p className="text-xs mt-1">Start solving to appear here!</p>
                    </div>
                  )}
                  <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary hover:bg-primary/10" asChild>
                    <Link href="/roster">
                      View Full Roster <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
