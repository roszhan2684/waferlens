import { notFound } from "next/navigation";
import { HOUR, MINUTE, REPORTS, T, WORKLOAD, getExperiment, windowStats } from "@waferlens/shared";
import { decide } from "@waferlens/benchmark";
import { PageStates } from "@/components/console/PageStates";
import { ReportDocument, type Alternative } from "@/components/reports/ReportDocument";

export function generateStaticParams() {
  return [{ id: "RPT-014" }, { id: "RPT-015" }];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: id };
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = REPORTS.find((r) => r.id === id);
  if (!report || id === "RPT-011") notFound();
  const slo = WORKLOAD.slo.ttftP95Ms;
  const exp = getExperiment(report.experimentId)!;

  const alternatives: Alternative[] =
    id === "RPT-014"
      ? ["EXP-105", "EXP-106", "EXP-103"].map((eid) => {
          const e = getExperiment(eid)!;
          const v = decide(e, slo);
          return { id: eid, title: e.title, change: e.diff.map((d) => `${d.key} ${d.from}→${d.to}`).join(", "), decision: v.decision, reason: v.reasons.join(" "), delta: v.comparison?.ttftP95.relDelta ?? null };
        })
      : [];

  const prod = windowStats("ttft_p95_ms", T.winnerPromoted + 15 * MINUTE, T.winnerPromoted + 12 * HOUR).mean;
  const production =
    id === "RPT-014"
      ? `Promoted to production via dep_5a21 (rolling, replica-0 then replica-1 after a 15-minute bake). Over the next 12 hours production p95 TTFT averaged ${Math.round(prod)} ms against 648 ms measured in replay, within the expected band. Regression Guard continues to compare production with this expectation.`
      : undefined;

  const limitations =
    id === "RPT-014"
      ? [
          ...exp.limitations,
          "Replay arrival process is a parameterized approximation (lognormal inter-arrivals, CV 1.6) of the source window, not a byte-for-byte replay.",
          "Kernel-level attribution uses a 9-day-old Nsight profile; it does not affect the measured result, only the explanation.",
          "Quality was checked with greedy exact match; sampled (temperature > 0) outputs were not evaluated separately.",
        ]
      : [...exp.limitations, "Draft: limitations are finalized when the experiment completes."];

  return (
    <div className="page">
      <PageStates empty={{ title: "Report is empty", body: "This report has no experiment attached. Attach a completed experiment to generate the methodology and results sections.", action: { label: "Back to reports", href: "/console/reports" } }}>
        <ReportDocument report={report} base={exp} slo={slo} alternatives={alternatives} production={production} limitations={limitations} />
      </PageStates>
    </div>
  );
}
