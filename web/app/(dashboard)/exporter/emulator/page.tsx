"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useContracts, useDashboard } from "@/features/dashboard/hooks/use-dashboard";
import { EmulatorControls } from "@/features/dashboard/components/emulator-controls";
import { WeatherPanel } from "@/features/dashboard/components/weather-panel";
import { IoTPanel } from "@/features/dashboard/components/iot-panel";
import { DisasterTrigger } from "@/features/dashboard/components/disaster-trigger";
import { FrozenBanner } from "@/features/dashboard/components/frozen-banner";
import { DashboardSkeleton } from "@/features/dashboard/components/skeletons/dashboard-skeleton";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ExporterEmulatorPage() {
  const t = useTranslations("common");
  const tDash = useTranslations("dashboard");
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
        <h1 className="text-2xl font-bold">{t("nav.emulator")}</h1>
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
        <h1 className="text-2xl font-bold">{t("nav.emulator")}</h1>
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-12 text-text-muted">
            {tDash("contract.noContract")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { contract } = dashboardQuery.data;
  const isFrozen = contract.status === "frozen";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{t("nav.emulator")}</h1>
        <Badge>{t("roles.exporter")}</Badge>
      </div>

      {isFrozen && <FrozenBanner />}

      {/* Emulator Controls — full width */}
      <EmulatorControls contract={contract} />

      {/* Data Input Panels */}
      <div className="grid gap-4 sm:grid-cols-2">
        <WeatherPanel contractId={contractId} disabled={isFrozen} />
        <IoTPanel contractId={contractId} disabled={isFrozen} />
      </div>

      {/* Disaster Trigger */}
      {!isFrozen && contract.status === "active" && (
        <DisasterTrigger contractId={contractId} />
      )}
    </div>
  );
}
