"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post("/api/auth/login", { email, password }, { showToastOnSuccess: "Welcome back, Admin!" });
      router.push("/admin/dashboard");
    } catch (error) {
      // handled by apiClient
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-zinc-950">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 shadow-2xl backdrop-blur-xl relative z-10 text-zinc-100">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700 mb-4">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Admin Portal</CardTitle>
          <CardDescription className="text-zinc-400">
            Authorized staff only. Please sign in to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-zinc-300" htmlFor="email">Admin Email</label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@cityuniversity.edu.bd" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                disabled={isLoading}
                className="bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none text-zinc-300" htmlFor="password">Password</label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                disabled={isLoading}
                className="bg-zinc-800/50 border-zinc-700 text-white focus-visible:ring-emerald-500"
              />
            </div>
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0" type="submit" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Sign in securely"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
