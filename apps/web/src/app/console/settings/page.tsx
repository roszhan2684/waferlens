import { AUDIT_EVENTS, INTEGRATIONS, MEMBERS, ORG } from "@waferlens/shared";
import { PageStates } from "@/components/console/PageStates";
import { PageHeader } from "@/components/console/parts";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="page">
      <PageHeader title="Settings" sub={`${ORG.name} · organization ${ORG.id}. Integrations, roles, approval policy, retention, keys, audit log and billing.`} />
      <PageStates empty={{ title: "No integrations connected", body: "Connect Prometheus or the vLLM metrics endpoint first. Everything else is optional for the first fingerprint.", action: { label: "Back to overview", href: "/console" } }}>
        <SettingsTabs integrations={INTEGRATIONS} members={MEMBERS} audit={AUDIT_EVENTS} org={ORG} />
      </PageStates>
    </div>
  );
}
