import Link from "next/link";
import { getTranslations } from "@/app/_server/actions/translations";
import { SnakeGame } from "@/app/_components/FeatureComponents/Games/SnakeGame";
import { AppShell } from "@/app/_components/FeatureComponents/Layout/AppShell";

export default async function NotFound() {
  const t = await getTranslations();

  return (
    <AppShell>
      <div className="px-4 py-8 lg:px-8">
        <div className="text-center mt-6 mb-12">
          <div className="text-6xl font-bold terminal-font text-status-error mb-2">404</div>
          <p className="terminal-font text-sm mb-4">{t("notFound.message")}</p>
          <Link
            href="/"
            className="ascii-border bg-background1 hover:bg-background2 px-4 py-2 terminal-font uppercase font-bold transition-colors text-sm inline-block"
          >
            {t("notFound.goHome")}
          </Link>
        </div>

        <SnakeGame />
      </div>
    </AppShell>
  );
}
