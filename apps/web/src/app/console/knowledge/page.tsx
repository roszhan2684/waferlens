import { KNOWLEDGE, PLAYBOOKS, fingerprintDistance, fingerprints } from "@waferlens/shared";
import { PageStates } from "@/components/console/PageStates";
import { PageHeader, Panel } from "@/components/console/parts";
import { KnowledgeSearch } from "@/components/knowledge/KnowledgeSearch";

export const metadata = { title: "Knowledge" };

export default function KnowledgePage() {
  const now = fingerprints.prodNow();
  const items = KNOWLEDGE.map((k) => ({ ...k, similarity: Math.exp(-3 * fingerprintDistance(now, k.fingerprint).total) }));
  return (
    <div className="page">
      <PageHeader
        title="Knowledge"
        sub="Experiment memory. Every outcome is stored with its workload fingerprint, including no-effect, regressed and invalid results. Similarity is computed against qwen-prod's current fingerprint, so analogs from different traffic rank lower."
      />
      <PageStates empty={{ title: "Experiment memory is empty", body: "Outcomes are written here automatically when an investigation reaches knowledge writeback.", action: { label: "Open Performance Agent", href: "/console/agent" } }}>
        <div className="grid cols-3" style={{ alignItems: "start" }}>
          <div className="span-2">
            <KnowledgeSearch items={items} />
          </div>
          <div className="stack">
            {PLAYBOOKS.map((p) => (
              <Panel key={p.id} title={p.title} actions={<span className="label">{p.id} · used {p.uses}×</span>}>
                <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6, fontSize: 13 }}>
                  {p.steps.map((s) => (
                    <li key={s} className="text-2">
                      {s}
                    </li>
                  ))}
                </ol>
              </Panel>
            ))}
          </div>
        </div>
      </PageStates>
    </div>
  );
}
