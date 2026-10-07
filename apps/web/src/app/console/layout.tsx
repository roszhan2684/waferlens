import type { Metadata } from "next";
import { DemoProvider } from "@/lib/demo-store";
import { Shell } from "@/components/console/Shell";
import "./console.css";

export const metadata: Metadata = {
  title: { default: "Console", template: "%s · WaferLens" },
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <Shell>{children}</Shell>
    </DemoProvider>
  );
}
