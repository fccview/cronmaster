"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/app/_components/GlobalComponents/Cards/Card";
import { Lock, Eye, EyeOff, Shield, AlertTriangle, Loader2 } from "lucide-react";

interface LoginFormProps {
  hasPassword?: boolean;
  hasOIDC?: boolean;
  oidcAutoRedirect?: boolean;
  version?: string;
}

export const LoginForm = ({
  hasPassword = false,
  hasOIDC = false,
  oidcAutoRedirect = false,
  version,
}: LoginFormProps) => {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();

  useEffect(() => {
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }

    if (oidcAutoRedirect && !hasPassword && hasOIDC) {
      setIsRedirecting(true);
      window.location.href = "/api/oidc/login";
    }
  }, [oidcAutoRedirect, hasPassword, hasOIDC, searchParams]);

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
        setError(result.message || t("login.loginFailed"));
      }
    } catch (error) {
      setError(t("login.genericError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOIDCLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/oidc/login";
  };

  if (isRedirecting) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-lg font-medium">{t("login.redirectingToOIDC")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("login.pleaseWait")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <CardTitle>{t("login.welcomeTitle")}</CardTitle>
        <CardDescription>
          {hasPassword && hasOIDC
            ? t("login.signInWithPasswordOrSSO")
            : hasOIDC
              ? t("login.signInWithSSO")
              : t("login.enterPasswordToContinue")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!hasPassword && !hasOIDC && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-400">
                <div className="font-medium">
                  {t("login.authenticationNotConfigured")}
                </div>
                <div className="mt-1">{t("login.noAuthMethodsEnabled")}</div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {hasPassword && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.enterPassword")}
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
                {isLoading ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </form>
          )}

          {hasPassword && hasOIDC && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background0 px-2 text-muted-foreground">
                  {t("login.orContinueWith")}
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
              {isLoading ? t("login.redirecting") : t("login.signInWithSSO")}
            </Button>
          )}

          {error && (
            <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        {version && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="text-center text-xs text-muted-foreground">
              Cr*nMaster {t("common.version", { version })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
