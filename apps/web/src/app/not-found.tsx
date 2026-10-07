import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div className="stack" style={{ alignItems: "flex-start", maxWidth: 440 }}>
        <Logo />
        <h1 style={{ fontSize: 32, letterSpacing: "-0.03em", marginTop: 16 }}>Nothing measured here.</h1>
        <p className="text-2">This page does not exist in the demo. Every route in the console is listed in the sidebar.</p>
        <div className="row">
          <Link href="/console" className="btn btn-primary">
            Open console
          </Link>
          <Link href="/" className="btn">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
