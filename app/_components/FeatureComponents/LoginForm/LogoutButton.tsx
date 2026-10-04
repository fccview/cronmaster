"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/app/_components/GlobalComponents/UIElements/Button";
import { SignOutIcon } from "@phosphor-icons/react";
import { createLogger } from "@/app/_utils/logger";
import { useTranslations } from "next-intl";

const log = createLogger("ui:auth");

export const LogoutButton = () => {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (error) {
      log.error("Logout error", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      disabled={isLoading}
      title={t("common.logout")}
    >
      <SignOutIcon className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">{t("common.logout")}</span>
    </Button>
  );
};
