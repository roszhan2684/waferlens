"use client";

import { useState } from "react";
import { INPUT_BUCKET_LABELS, OUTPUT_BUCKET_LABELS, type FingerprintDistance, type WorkloadFingerprint } from "@waferlens/shared";
import { PairedBars } from "../charts/PairedBars";
import { FingerprintGlyph } from "../lens/FingerprintGlyph";
import { ReplayValidity } from "../lens/ReplayValidity";

interface Option {
  id: string;
  label: string;
  replay: WorkloadFingerprint;
  distance: FingerprintDistance;
  note: string;
}

const marginalInput = (fp: WorkloadFingerprint) => fp.joint.map((row) => row.reduce((a, b) => a + b, 0));
const marginalOutput = (fp: WorkloadFingerprint) => fp.joint[0]!.map((_, j) => fp.joint.reduce((a, row) => a + (row[j] ?? 0), 0));

export function ReplayCompare({ source, options }: { source: WorkloadFingerprint; options: Option[] }) {
  const [sel, setSel] = useState(options[0]!.id);
  const o = options.find((x) => x.id === sel)!;
  const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Replay validity: production vs replay</h2>
        <div className="seg" role="group" aria-label="Replay capture">
          {options.map((x) => (
            <button key={x.id} aria-pressed={x.id === sel} onClick={() => setSel(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div className="panel-body">
        <p className="text-2" style={{ marginBottom: 16 }}>
          {o.note}
        </p>
        <div className="grid cols-3" style={{ alignItems: "start" }}>
          <FingerprintGlyph source={source} target={o.replay} sourceLabel="Production source" targetLabel={o.id} size={260} />
          <div className="span-2">
            <ReplayValidity distance={o.distance} sourceLabel="Prod" targetLabel={o.id} />
          </div>
        </div>
        <div className="grid cols-2" style={{ marginTop: 20 }}>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              Input tokens · share of requests
            </div>
            <PairedBars
              title="Input token distribution, production vs replay"
              categories={INPUT_BUCKET_LABELS}
              series={[
                { id: "prod", label: "Production", color: "var(--s-baseline)", values: marginalInput(source) },
                { id: "replay", label: o.id, color: "var(--s-candidate)", values: marginalInput(o.replay) },
              ]}
              format={pct}
            />
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              Output tokens · share of requests
            </div>
            <PairedBars
              title="Output token distribution, production vs replay"
              categories={OUTPUT_BUCKET_LABELS}
              series={[
                { id: "prod", label: "Production", color: "var(--s-baseline)", values: marginalOutput(source) },
                { id: "replay", label: o.id, color: "var(--s-candidate)", values: marginalOutput(o.replay) },
              ]}
              format={pct}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
