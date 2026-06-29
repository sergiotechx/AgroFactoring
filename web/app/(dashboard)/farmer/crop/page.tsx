"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useContracts, useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { PhaseTimeline } from "@/features/dashboard/components/phase-timeline";
import { DashboardSkeleton } from "@/features/dashboard/components/skeletons/dashboard-skeleton";
import { FrozenBanner } from "@/features/dashboard/components/frozen-banner";
import { cn } from "@/lib/utils";
import { formatUSDC, formatDate, formatTxHash, getStellarExplorerUrl } from "@/lib/format";
import { Sprout, Weight, DollarSign, Layers, AlertTriangle, RefreshCw, ChevronDown, ExternalLink, Calendar, Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Phase, LedgerEntry, Contract } from "@/features/dashboard/types";

export default function FarmerCropPage() {
  const t = useTranslations("common");
  const tDash = useTranslations("dashboard");
  const tPhases = useTranslations("phases");

  const contractsQuery = useContracts();
  const contractId = contractsQuery.data?.contracts?.[0]?.id ?? null;
  const dashboardQuery = useDashboard(contractId);

  if (contractsQuery.isLoading || dashboardQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  if (contractsQuery.isError || dashboardQuery.isError) {
    const error = contractsQuery.error || dashboardQuery.error;
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("nav.myCrop")}</h1>
        <Card className="border-danger/30">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <AlertTriangle className="h-10 w-10 text-danger" />
            <p className="text-sm text-text-muted">
              {error instanceof Error ? error.message : tDash("error.description")}
            </p>
            <Button variant="outline" size="sm" onClick={() => { contractsQuery.refetch(); dashboardQuery.refetch(); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {tDash("error.retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!contractId || !dashboardQuery.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("nav.myCrop")}</h1>
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-12 text-text-muted">
            {tDash("contract.noContract")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contract, crop, phases, ledger } = dashboardQuery.data;
  const isFrozen = contract.status === "frozen";
  const totalPhases = phases.length || 5;
  const completedPhases = contract.current_phase - 1;
  const progressPercent = (completedPhases / totalPhases) * 100;

  const totalReleased = ledger.reduce((sum, e) => sum + e.amount_released, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{t("nav.myCrop")}</h1>
        <Badge variant="success">{t("roles.farmer")}</Badge>
      </div>

      {isFrozen && <FrozenBanner />}

      {/* Crop Info */}
      {crop && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                {tDash("metrics.cropType")}
              </CardTitle>
              <Sprout className="h-4 w-4 text-text-muted" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{crop.crop_type}</p>
              <p className="mt-1 text-xs text-text-muted">{tDash("metrics.variety")}: {crop.variety}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                {tDash("metrics.estimatedTons")}
              </CardTitle>
              <Weight className="h-4 w-4 text-text-muted" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{crop.estimated_tons}</p>
              <p className="mt-1 text-xs text-text-muted">ton</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                {tDash("metrics.fundsReceived")}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-text-muted" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tabular-nums">{formatUSDC(totalReleased)}</p>
              <p className="mt-1 text-xs text-text-muted">
                {tDash("metrics.ofTotal", { total: formatUSDC(contract.total_amount) })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-text-secondary">
                {tDash("metrics.currentPhase")}
              </CardTitle>
              <Layers className="h-4 w-4 text-text-muted" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold tabular-nums">{contract.current_phase}</span>
                <span className="text-sm text-text-muted">{tDash("metrics.ofPhases", { total: totalPhases })}</span>
              </div>
              <Progress value={progressPercent} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Phase detail */}
      <Card className={isFrozen ? "border-danger/20" : undefined}>
        <CardContent className="p-6">
          <PhaseTimeline
            phases={phases}
            ledger={ledger}
            currentPhase={contract.current_phase}
            contractStatus={contract.status}
          />
        </CardContent>
      </Card>

      {/* Per-phase detail breakdown */}
      <PhaseDetailBreakdown
        phases={phases}
        ledger={ledger}
        contract={contract}
        isFrozen={isFrozen}
        totalAmount={contract.total_amount}
      />
    </div>
  );
}

/* ── Phase Detail Breakdown (accordion + analytics) ──── */

function PhaseDetailBreakdown({
  phases,
  ledger,
  contract,
  isFrozen,
  totalAmount,
}: {
  phases: Phase[];
  ledger: LedgerEntry[];
  contract: Contract;
  isFrozen: boolean;
  totalAmount: number;
}) {
  const tPhases = useTranslations("phases");
  const [expanded, setExpanded] = useState<number | null>(null);

  const toggle = (phaseNum: number) =>
    setExpanded((prev) => (prev === phaseNum ? null : phaseNum));

  // Cumulative calculations
  const cumulativeAt = (upToPhase: number) =>
    ledger
      .filter((e) => e.phase_number <= upToPhase)
      .reduce((sum, e) => sum + e.amount_released, 0);

  const totalReleased = ledger.reduce((sum, e) => sum + e.amount_released, 0);
  const remaining = totalAmount - totalReleased;

  return (
    <div className="space-y-4">
      {/* Financial summary bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-lg font-semibold">
              {tPhases("detail.cumulative")}
            </span>
            <span className="text-sm tabular-nums font-semibold">
              {formatUSDC(totalReleased)}{" "}
              <span className="text-text-muted font-normal">
                / {formatUSDC(totalAmount)}
              </span>
            </span>
          </div>
          <Progress
            value={totalAmount > 0 ? (totalReleased / totalAmount) * 100 : 0}
            className="h-2.5"
            indicatorClassName={
              totalReleased >= totalAmount
                ? "bg-success"
                : isFrozen
                  ? "bg-danger"
                  : undefined
            }
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-text-muted">
              {Math.round(
                totalAmount > 0 ? (totalReleased / totalAmount) * 100 : 0
              )}
              % {tPhases("detail.ofTotal")}
            </span>
            <span className="text-xs text-text-muted tabular-nums">
              {tPhases("detail.remaining")}: {formatUSDC(remaining)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Phase accordion list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {tPhases("detail.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {phases.map((phase) => {
            const released = ledger.find(
              (e) => e.phase_number === phase.phase_number
            );
            const isComplete = !!released;
            const isCurrent = phase.phase_number === contract.current_phase;
            const isOpen = expanded === phase.phase_number;
            const cumulative = cumulativeAt(phase.phase_number);
            const cumulativePct =
              totalAmount > 0
                ? Math.round((cumulative / totalAmount) * 100)
                : 0;

            return (
              <div
                key={phase.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  isOpen
                    ? "border-accent/30 bg-accent/[0.03]"
                    : "border-transparent hover:bg-surface-alt/60"
                )}
              >
                {/* Row header — clickable */}
                <button
                  onClick={() => toggle(phase.phase_number)}
                  className="flex w-full items-center justify-between gap-4 p-3 text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isComplete
                          ? "bg-success text-white"
                          : isCurrent
                            ? "bg-accent text-white"
                            : isFrozen && !isComplete
                              ? "bg-danger/20 text-danger border border-danger/30"
                              : "border-2 border-border text-text-muted"
                      )}
                    >
                      {phase.phase_number}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {tPhases(`names.${phase.phase_number}`)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm tabular-nums font-medium">
                      {formatUSDC(phase.amount_requested)}
                    </span>
                    {isComplete ? (
                      <Badge variant="success" className="text-[10px]">
                        {tPhases("status.completed")}
                      </Badge>
                    ) : isFrozen ? (
                      <Badge variant="danger" className="text-[10px]">
                        {tPhases("status.frozen")}
                      </Badge>
                    ) : isCurrent ? (
                      <Badge className="text-[10px]">
                        {tPhases("status.current")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {tPhases("status.pending")}
                      </Badge>
                    )}
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-text-muted" />
                    </motion.div>
                  </div>
                </button>

                {/* Expandable detail */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-0 space-y-3">
                        {/* Description */}
                        <div className="flex gap-2 rounded-md bg-surface-alt/80 p-3">
                          <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {tPhases(
                              `descriptions.${phase.phase_number}`
                            )}
                          </p>
                        </div>

                        {/* Release details or pending message */}
                        {isComplete && released ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <Calendar className="h-3.5 w-3.5 text-text-muted" />
                              <span>
                                {tPhases("detail.releasedOn")}:{" "}
                                <span className="font-medium text-foreground">
                                  {formatDate(released.timestamp)}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                              <ExternalLink className="h-3.5 w-3.5 text-text-muted" />
                              <span>{tPhases("detail.txHash")}: </span>
                              <a
                                href={getStellarExplorerUrl(released.tx_hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-accent hover:text-accent-hover transition-colors"
                              >
                                {formatTxHash(released.tx_hash)}
                              </a>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-text-muted italic">
                            {tPhases("detail.noDetails")}
                          </p>
                        )}

                        {/* Cumulative progress up to this phase */}
                        {isComplete && (
                          <div>
                            <div className="flex justify-between text-xs text-text-muted mb-1">
                              <span>{tPhases("detail.cumulative")}</span>
                              <span className="tabular-nums">
                                {formatUSDC(cumulative)} ({cumulativePct}%)
                              </span>
                            </div>
                            <Progress
                              value={cumulativePct}
                              className="h-1.5"
                              indicatorClassName="bg-success/70"
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
