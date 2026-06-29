"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatUSDC } from "@/lib/format";
import type { Phase, LedgerEntry, ContractStatus } from "@/features/dashboard/types";
import { Check, Snowflake } from "lucide-react";
import { motion } from "motion/react";

interface PhaseTimelineProps {
  phases: Phase[];
  ledger: LedgerEntry[];
  currentPhase: number;
  contractStatus: ContractStatus;
}

type PhaseState = "completed" | "current" | "pending" | "frozen";

function getPhaseState(
  phaseNumber: number,
  currentPhase: number,
  ledger: LedgerEntry[],
  contractStatus: ContractStatus
): PhaseState {
  const hasRelease = ledger.some((e) => e.phase_number === phaseNumber);
  if (hasRelease) return "completed";
  if (contractStatus === "frozen") return "frozen";
  if (phaseNumber === currentPhase) return "current";
  return "pending";
}

const stateStyles = {
  completed: {
    circle: "bg-success text-white",
    line: "bg-success",
    text: "text-foreground",
  },
  current: {
    circle: "border-2 border-accent text-accent ring-4 ring-accent/20",
    line: "bg-border",
    text: "text-accent font-semibold",
  },
  pending: {
    circle: "border-2 border-border text-text-muted",
    line: "bg-border",
    text: "text-text-muted",
  },
  frozen: {
    circle: "bg-danger/10 border-2 border-danger text-danger",
    line: "bg-danger/30",
    text: "text-danger",
  },
};

export function PhaseTimeline({
  phases,
  ledger,
  currentPhase,
  contractStatus,
}: PhaseTimelineProps) {
  const t = useTranslations("phases");

  return (
    <div className="w-full">
      <h2 className="mb-6 text-lg font-semibold">{t("timeline.title")}</h2>

      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-start justify-between">
        {phases.map((phase, i) => {
          const state = getPhaseState(
            phase.phase_number,
            currentPhase,
            ledger,
            contractStatus
          );
          const styles = stateStyles[state];
          const isLast = i === phases.length - 1;

          return (
            <motion.div
              key={phase.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className="flex flex-1 flex-col items-center relative"
            >
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute top-5 left-1/2 h-0.5 w-full",
                    state === "completed" ? styles.line : "bg-border"
                  )}
                />
              )}

              {/* Circle */}
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface transition-all",
                  styles.circle,
                  state === "current" && "animate-pulse"
                )}
              >
                {state === "completed" ? (
                  <Check className="h-5 w-5" />
                ) : state === "frozen" ? (
                  <Snowflake className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-bold">
                    {phase.phase_number}
                  </span>
                )}
              </div>

              {/* Label */}
              <div className="mt-3 text-center">
                <p className={cn("text-xs font-medium", styles.text)}>
                  {t(`names.${phase.phase_number}`)}
                </p>
                <p className="mt-1 text-xs text-text-muted tabular-nums">
                  {formatUSDC(phase.amount_requested)}
                </p>
                {state !== "pending" && state !== "frozen" && (
                  <p className="mt-0.5 text-[10px] text-text-muted">
                    {t(`status.${state}`)}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 sm:hidden">
        {phases.map((phase, i) => {
          const state = getPhaseState(
            phase.phase_number,
            currentPhase,
            ledger,
            contractStatus
          );
          const styles = stateStyles[state];
          const isLast = i === phases.length - 1;

          return (
            <div key={phase.id} className="flex items-start gap-4">
              {/* Column: circle + line */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full bg-surface transition-all",
                    styles.circle,
                    state === "current" && "animate-pulse"
                  )}
                >
                  {state === "completed" ? (
                    <Check className="h-4 w-4" />
                  ) : state === "frozen" ? (
                    <Snowflake className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">
                      {phase.phase_number}
                    </span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-8",
                      state === "completed" ? styles.line : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className="pb-6 pt-1">
                <p className={cn("text-sm font-medium", styles.text)}>
                  {t(`names.${phase.phase_number}`)}
                </p>
                <p className="text-xs text-text-muted tabular-nums">
                  {formatUSDC(phase.amount_requested)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
