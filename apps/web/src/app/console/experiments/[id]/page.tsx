import Link from "next/link";
import { notFound } from "next/navigation";
import { REPLAY_JOBS, WORKLOAD, getExperiment, getExperiments } from "@waferlens/shared";
import { PageStates } from "@/components/console/PageStates";
import { PageHeader } from "@/components/console/parts";
import { ExperimentDetail } from "@/components/experiments/ExperimentDetail";
import { Icon } from "@/components/ui/icons";

export function generateStaticParams() {
  return getExperiments().map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: id };
}

export default async function ExperimentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exp = getExperiment(id);
  if (!exp) notFound();
  const job = REPLAY_JOBS.find((j) => j.experimentId === id);
  return (
    <div className="page">
      <PageHeader
        crumbs={[{ href: "/console/experiments", label: "Experiments" }]}
        eyebrow={<span className="mono muted">{exp.id}</span>}
        title={exp.title}
        actions={
          exp.investigationId && (
            <Link href={`/console/agent/${exp.investigationId}`} className="btn">
              <Icon name="agent" size={13} /> {exp.investigationId} · {exp.hypothesisId}
            </Link>
          )
        }
      />
      <PageStates
        empty={{ title: "Experiment draft is empty", body: "Pick one variable to change, a capture to replay and success criteria. The agent can draft this from a hypothesis.", action: { label: "Back to experiments", href: "/console/experiments" } }}
        partial="Environment fingerprint is missing the driver for one replay node. The environment gate will report UNKNOWN until the node re-registers."
      >
        <ExperimentDetail base={exp} slo={WORKLOAD.slo.ttftP95Ms} quotaUsd={job?.quotaCostUsd ?? 20} />
      </PageStates>
    </div>
  );
}
