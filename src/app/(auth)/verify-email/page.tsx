"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { OtpInput } from "@/components/ui/otp-input";
import toast from "react-hot-toast";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }
    
    setIsLoading(true);
    try {
      await apiClient.post("/api/auth/verify-email", { otp }, { showToastOnSuccess: "Email verified successfully!" });
      router.push("/dashboard");
    } catch (error) {
      // API error handles toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(60);
    
    try {
      await apiClient.post("/api/auth/resend-verification", {}, { showToastOnSuccess: "Verification code sent!" });
    } catch (error) {
      setCanResend(true);
      setCountdown(0);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 mesh-bg">
      <div className="absolute inset-0 bg-background/50 backdrop-blur-3xl -z-10" />
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Verify your email</CardTitle>
          <CardDescription>
            We sent a 6-digit verification code to your email. Enter it below to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading || otp.length !== 6}>
              {isLoading ? "Verifying..." : "Verify Email"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2">
          <div className="text-sm text-muted-foreground">
            Didn't receive the code?
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleResend} 
            disabled={!canResend || isLoading}
          >
            {canResend ? "Resend Code" : `Resend in ${countdown}s`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
