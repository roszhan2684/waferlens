"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Icon } from "../ui/icons";
import { TOUR_STEPS } from "./tour-steps";

export const TOUR_SEEN_KEY = "waferlens:tour-seen";

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;
const CARD_W = 380;
const TOPBAR = 60;

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(TOUR_SEEN_KEY, "1");
  } catch {
    /* storage blocked: the tour simply shows again next time */
  }
}

/**
 * Spotlight walkthrough of the demo script. The current element is cut out of a
 * dimmed overlay (four blocking panes around it, so it stays clickable) and a
 * card explains it. Next / Back move through pages; Skip ends the tour.
 */
export function GuidedTour() {
  const { tourOpen, setTourOpen, tourStep, setTourStep, setView } = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const [box, setBox] = useState<Box | null>(null);
  const [searching, setSearching] = useState(false);
  const targetRef = useRef<HTMLElement | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = TOUR_STEPS[tourStep];

  // First visit to the console starts the tour once.
  useEffect(() => {
    if (!readSeen()) {
      setTourStep(0);
      setTourOpen(true);
    }
  }, [setTourOpen, setTourStep]);

  const close = useCallback(() => {
    markSeen();
    setTourOpen(false);
    setBox(null);
  }, [setTourOpen]);

  const go = useCallback(
    (i: number) => {
      if (i < 0) return;
      if (i >= TOUR_STEPS.length) return close();
      setBox(null);
      setTourStep(i);
    },
    [close, setTourStep],
  );

  const measure = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const top = Math.max(TOPBAR, r.top - PAD);
    const bottom = Math.min(window.innerHeight - 8, r.bottom + PAD);
    setBox({ top, left: Math.max(4, r.left - PAD), width: Math.min(window.innerWidth - 8, r.width + PAD * 2), height: Math.max(40, bottom - top) });
  }, []);

  // Navigate to the step's page, wait for its target, scroll it into view.
  useEffect(() => {
    if (!tourOpen || !step) return;
    setView("live");
    if (pathname !== step.route) {
      setBox(null);
      router.push(step.route);
      return;
    }
    let cancelled = false;
    let tries = 0;
    setSearching(true);
    const find = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) {
        if (tries++ < 50) window.setTimeout(find, 100);
        else {
          setSearching(false);
          go(tourStep + 1);
        }
        return;
      }
      targetRef.current = el;
      const r = el.getBoundingClientRect();
      const tall = window.innerWidth < 640 || r.height > window.innerHeight * 0.6;
      const y = window.scrollY + r.top - (tall ? TOPBAR + 24 : (window.innerHeight - r.height) / 2);
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      setSearching(false);
      window.setTimeout(measure, 30);
      window.setTimeout(measure, 450);
    };
    find();
    return () => {
      cancelled = true;
    };
  }, [tourOpen, step, pathname, router, measure, go, tourStep, setView]);

  // Keep the spotlight glued to the target while the page scrolls or resizes.
  useEffect(() => {
    if (!tourOpen) return;
    const onMove = () => measure();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const ro = new ResizeObserver(onMove);
    if (targetRef.current) ro.observe(targetRef.current);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      ro.disconnect();
    };
  }, [tourOpen, measure, box === null]);

  useEffect(() => {
    if (!tourOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(tourStep + 1);
      if (e.key === "ArrowLeft") go(tourStep - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tourOpen, tourStep, go, close]);

  useLayoutEffect(() => {
    if (box) nextRef.current?.focus({ preventScroll: true });
  }, [box]);

  if (!tourOpen || !step) return null;

  const vw = typeof window === "undefined" ? 1440 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  const narrow = vw < 640;

  // Card placement: below, above, beside, or docked to the bottom.
  let card: React.CSSProperties = { width: narrow ? vw - 24 : CARD_W };
  if (!box || narrow) {
    card = { ...card, left: 12, right: 12, bottom: 12 };
  } else {
    const cardH = 250;
    const left = Math.min(Math.max(12, box.left), vw - CARD_W - 12);
    if (box.top + box.height + cardH + 16 < vh) card = { ...card, top: box.top + box.height + 12, left };
    else if (box.top - cardH - 12 > TOPBAR) card = { ...card, top: box.top - cardH - 12, left };
    else if (box.left + box.width + CARD_W + 24 < vw) card = { ...card, top: Math.max(TOPBAR + 8, Math.min(box.top, vh - cardH - 12)), left: box.left + box.width + 12 };
    else if (box.left - CARD_W - 24 > 0) card = { ...card, top: Math.max(TOPBAR + 8, Math.min(box.top, vh - cardH - 12)), left: box.left - CARD_W - 12 };
    else card = { ...card, right: 24, bottom: 24 };
  }

  const pct = ((tourStep + 1) / TOUR_STEPS.length) * 100;

  return (
    <div className="tour-layer" aria-live="polite">
      {box ? (
        <>
          <div className="tour-dim" style={{ top: 0, left: 0, right: 0, height: box.top }} />
          <div className="tour-dim" style={{ top: box.top + box.height, left: 0, right: 0, bottom: 0 }} />
          <div className="tour-dim" style={{ top: box.top, left: 0, width: box.left, height: box.height }} />
          <div className="tour-dim" style={{ top: box.top, left: box.left + box.width, right: 0, height: box.height }} />
          <div className="tour-ring" style={{ top: box.top, left: box.left, width: box.width, height: box.height }} />
        </>
      ) : (
        <div className="tour-dim" style={{ inset: 0 }} />
      )}

      <div className="tour-card" role="dialog" aria-modal="false" aria-labelledby="tour-title" style={card}>
        <div className="tour-progress" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <span className="label" style={{ fontSize: 10, color: "var(--sage)" }}>
            {step.beat}
          </span>
          <span className="label num" style={{ fontSize: 10 }}>
            {tourStep + 1} / {TOUR_STEPS.length}
          </span>
        </div>
        <h2 id="tour-title" className="tour-title">
          {step.title}
        </h2>
        <p className="tour-body">{searching && !box ? "Opening the page…" : step.body}</p>
        {step.tryIt && (
          <p className="tour-try">
            <Icon name="arrow-right" size={12} /> {step.tryIt}
          </p>
        )}
        <div className="row-between" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost btn-sm" onClick={close}>
            Skip tour
          </button>
          <div className="row" style={{ gap: 6 }}>
            <button className="btn btn-sm" onClick={() => go(tourStep - 1)} disabled={tourStep === 0}>
              Back
            </button>
            <button ref={nextRef} className="btn btn-sage btn-sm" onClick={() => go(tourStep + 1)}>
              {tourStep === TOUR_STEPS.length - 1 ? "Finish" : "Next"} {tourStep < TOUR_STEPS.length - 1 && <Icon name="arrow-right" size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
