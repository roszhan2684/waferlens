import {
  CONFIG_REGRESSED,
  CONFIG_TUNED,
  ENDPOINTS,
  ENV_PROD_0110,
  ENV_PROD_0111,
  HARDWARE_POOLS,
  OTHER_WORKLOADS,
  WORKLOAD,
  type EngineConfig,
} from "@waferlens/shared";
import { PageStates } from "@/components/console/PageStates";
import { EnvironmentPanel, PageHeader, Panel } from "@/components/console/parts";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Inventory" };

export default function InventoryPage() {
  const workloads = [WORKLOAD, ...OTHER_WORKLOADS];
  const keys = Object.keys(CONFIG_TUNED) as (keyof EngineConfig)[];
  return (
    <div className="page">
      <PageHeader title="Inventory" sub="Models, endpoints, engines, accelerator pools and environments. Environment fingerprints are what Benchmark Guardian compares, so they are recorded on every deploy." />
      <PageStates empty={{ title: "No workloads registered", body: "Register a workload to start: model, engine, endpoint and SLO policy.", code: "POST /v1/workloads\n{ \"name\": \"qwen-prod\", \"model\": \"Qwen3-32B\", \"engine\": \"vllm\",\n  \"slo\": { \"ttft_p95_ms\": 700, \"itl_p95_ms\": 45 } }", action: { label: "Back to overview", href: "/console" } }}>
        <Panel title="Workloads" pad={false}>
          <div className="table-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Workload</th>
                  <th>Model</th>
                  <th>Engine</th>
                  <th>Environment</th>
                  <th>SLO</th>
                  <th>Pool</th>
                </tr>
              </thead>
              <tbody>
                {workloads.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <span className="mono">{w.name}</span>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {w.id}
                      </div>
                    </td>
                    <td>
                      {w.model} <span className="muted mono" style={{ fontSize: 11 }}>@{w.modelRevision}</span>
                    </td>
                    <td>{w.engine}</td>
                    <td>
                      <span className={`badge ${w.environment === "production" ? "badge-sage" : ""}`}>{w.environment}</span>
                    </td>
                    <td className="num" style={{ fontSize: 12 }}>
                      p95 TTFT ≤ {w.slo.ttftP95Ms} ms · ITL ≤ {w.slo.itlP95Ms} ms
                    </td>
                    <td className="mono muted" style={{ fontSize: 12 }}>
                      {w.hardwarePoolId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="grid cols-2" style={{ marginTop: 12, alignItems: "start" }}>
          <Panel title="Accelerator pools" pad={false}>
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Pool</th>
                    <th>Accelerator</th>
                    <th>Topology</th>
                    <th className="r">$/hour</th>
                  </tr>
                </thead>
                <tbody>
                  {HARDWARE_POOLS.map((p) => (
                    <tr key={p.id}>
                      <td className="id">{p.id}</td>
                      <td>
                        {p.vendor} {p.accelerator} ×{p.count}
                      </td>
                      <td className="text-2">
                        {p.topology}
                        {p.vendor === "AMD" && (
                          <div className="muted" style={{ fontSize: 11 }}>
                            ROCm telemetry adapter is on the roadmap (Phase 8)
                          </div>
                        )}
                      </td>
                      <td className="r">{p.hourlyCostUsd ? `$${p.hourlyCostUsd.toFixed(2)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Endpoints" pad={false}>
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Route</th>
                    <th>Region</th>
                    <th className="r">Replicas</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((e) => (
                    <tr key={e.id}>
                      <td className="id">{e.id}</td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {e.route}
                      </td>
                      <td className="text-2">
                        {e.region} · {e.provider}
                      </td>
                      <td className="r">{e.replicas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="grid cols-2" style={{ marginTop: 12, alignItems: "start" }}>
          <Panel title="qwen-prod · current environment" actions={<span className="label">since dep_7f3c</span>}>
            <EnvironmentPanel env={ENV_PROD_0111} compare={ENV_PROD_0110} />
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Highlighted fields changed in the last deploy. A changed engine or driver triggers benchmark re-certification.
            </p>
          </Panel>
          <Panel title="qwen-prod · engine config" actions={<span className="label">desired vs rendered</span>} pad={false}>
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Arg</th>
                    <th>Desired (values.yaml)</th>
                    <th>Rendered (pod spec)</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => {
                    const drift = CONFIG_TUNED[k] !== CONFIG_REGRESSED[k];
                    return (
                      <tr key={k}>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {k}
                        </td>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {String(CONFIG_TUNED[k])}
                        </td>
                        <td className="mono" style={{ fontSize: 12, color: drift ? "var(--bad)" : undefined }}>
                          {String(CONFIG_REGRESSED[k])}
                          {drift && (
                            <span className="badge badge-bad" style={{ marginLeft: 8, height: 18, fontSize: 10 }}>
                              <Icon name="alert" size={10} /> drift
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </PageStates>
    </div>
  );
}
