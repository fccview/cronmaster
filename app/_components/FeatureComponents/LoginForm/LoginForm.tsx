"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/app/_components/GlobalComponents/Cards/Card";
import { Lock, Eye, EyeOff, Shield } from "lucide-react";

interface LoginFormProps {
  hasPassword?: boolean;
  hasOIDC?: boolean;
}

export const LoginForm = ({ hasPassword = false, hasOIDC = false }: LoginFormProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();

      if (result.success) {
        router.push("/");
      } else {
        setError(result.message || "Login failed");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOIDCLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/oidc/login";
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>Welcome to Cr*nMaster</CardTitle>
        <CardDescription>
          {hasPassword && hasOIDC
            ? "Sign in with password or SSO"
            : hasOIDC
            ? "Sign in with SSO"
            : "Enter your password to continue"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {hasPassword && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !password.trim()}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          )}

          {hasPassword && hasOIDC && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
          )}

          {hasOIDC && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleOIDCLogin}
              disabled={isLoading}
            >
              <Shield className="w-4 h-4 mr-2" />
              {isLoading ? "Redirecting..." : "Sign in with SSO"}
            </Button>
          )}

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-3">
              {error}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
