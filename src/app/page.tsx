import Link from "next/link";
import { ArrowRight, Bus, Calendar, FileText, Bell, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar (Mocked for Landing) */}
      <header className="sticky top-0 z-50 w-full glass border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              CU
            </div>
            <span className="text-xl font-bold tracking-tight">CampusOS</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">Features</Link>
            <Link href="#scenarios" className="text-sm font-medium hover:text-primary transition-colors">How it helps</Link>
            <Link href="#faq" className="text-sm font-medium hover:text-primary transition-colors">FAQ</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hidden md:inline-flex">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 mesh-bg -z-10" />
          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                  One place for all of <br className="hidden md:block" /> City University
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Never miss an event, miss a bus, or lose track of important notices again. Experience the smartest way to navigate your campus life.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <Link href="/signup">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full shadow-lg hover:shadow-primary/25 transition-all text-base">
                    Join CampusOS <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 px-8 rounded-full text-base">
                    Explore Features
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Live Stats Ticker */}
        <section className="border-y border-border/50 bg-muted/30 py-6">
          <div className="container mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">5,000+</p>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Students</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-secondary">24/7</p>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Bus Updates</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">100+</p>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Weekly Events</p>
            </div>
          </div>
        </section>

        {/* Feature Modules */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Everything you need, in one place</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                CampusOS brings together all the essential services of City University into a single, intuitive platform.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-border/50 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <Bus className="h-10 w-10 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <CardTitle>Live Bus Tracker</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Real-time schedules and capacity for all university routes. Never miss a ride to or from campus again.
                  </CardDescription>
                </CardContent>
              </Card>
              
              <Card className="border-border/50 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <Calendar className="h-10 w-10 text-secondary mb-2 group-hover:scale-110 transition-transform" />
                  <CardTitle>Events & Clubs</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Discover what&apos;s happening this week. Join clubs, RSVP to events, and stay engaged with campus life.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border/50 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <Bell className="h-10 w-10 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <CardTitle>Smart Notices</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Get instant alerts for class cancellations, administrative notices, and department updates tailored to you.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-border/50 hover:border-primary/50 transition-colors group">
                <CardHeader>
                  <Search className="h-10 w-10 text-secondary mb-2 group-hover:scale-110 transition-transform" />
                  <CardTitle>Lost & Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    A centralized board to report lost items or claim things you've found on campus. Help keep our community connected.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Scenarios / How it Solves Your Day */}
        <section id="scenarios" className="w-full py-12 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">How it solves your day</h2>
                <div className="space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="rounded-full bg-primary/10 p-2 text-primary mt-1">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">No more bus confusion</h4>
                      <p className="text-sm text-muted-foreground">Check the next bus departure instantly from the widget before leaving your room.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="rounded-full bg-secondary/10 p-2 text-secondary mt-1">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Never miss a class cancellation</h4>
                      <p className="text-sm text-muted-foreground">Receive push notifications immediately when notices are posted for your department.</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="rounded-full bg-primary/10 p-2 text-primary mt-1">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Find your lost resources</h4>
                      <p className="text-sm text-muted-foreground">Easily post about a lost ID card or notebook, and let the community help you find it.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mx-auto w-full max-w-[500px] h-[400px] rounded-2xl glass border flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl"></div>
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 space-y-4 w-full">
                   <div className="bg-background rounded-xl p-4 shadow-sm border animate-in fade-in slide-in-from-bottom-4">
                     <p className="font-medium text-sm">Notice: Next bus to campus leaves in 5 mins.</p>
                     <span className="text-xs text-muted-foreground">Just now</span>
                   </div>
                   <div className="bg-background rounded-xl p-4 shadow-sm border animate-in fade-in slide-in-from-bottom-8 delay-150">
                     <p className="font-medium text-sm">Event Reminder: Tech Fest Hackathon starts tomorrow.</p>
                     <span className="text-xs text-muted-foreground">10 mins ago</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-6 text-center glass p-8 md:p-16 rounded-3xl border border-border/50 max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tighter md:text-5xl">Ready to simplify your campus life?</h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Join thousands of City University students already using CampusOS.
              </p>
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8 rounded-full text-lg mt-4">
                  Create your account
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-background py-8">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              CU
            </div>
            <span className="text-sm font-semibold tracking-tight">CampusOS</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} CampusOS. Built for City University, Bangladesh.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
