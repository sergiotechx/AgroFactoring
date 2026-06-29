"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("dashboard");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="w-full max-w-md border-danger/30">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <AlertTriangle className="h-12 w-12 text-danger" />
          <div>
            <p className="text-lg font-semibold">{t("error.title")}</p>
            <p className="mt-1 text-sm text-text-muted">
              {error.message || t("error.description")}
            </p>
          </div>
          <Button variant="outline" onClick={reset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("error.retry")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
