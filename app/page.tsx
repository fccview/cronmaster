import { TabbedInterface } from "@/app/_components/FeatureComponents/Layout/TabbedInterface";
import { AppShell } from "@/app/_components/FeatureComponents/Layout/AppShell";
import { WrapperScriptWarning } from "@/app/_components/FeatureComponents/System/WrapperScriptWarning";
import { getCronJobs } from "@/app/_utils/cronjob-utils";
import { fetchScripts } from "@/app/_server/actions/scripts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function Home() {
  const [cronJobs, scripts] = await Promise.all([
    getCronJobs(),
    fetchScripts(),
  ]);

  return (
    <AppShell>
      <div className="px-4 pt-6 pb-24 lg:px-8 lg:py-8">
        <WrapperScriptWarning />
        <TabbedInterface cronJobs={cronJobs} scripts={scripts} />
      </div>
    </AppShell>
  );
}
