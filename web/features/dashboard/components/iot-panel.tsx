"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api-client";
import { Cpu, Leaf, Droplets, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const iotSchema = z.object({
  ndvi_index: z.coerce.number().min(0).max(1),
  soil_moisture: z.coerce.number().min(0).max(100),
});

type IoTFormData = z.infer<typeof iotSchema>;

interface IoTPanelProps {
  contractId: string;
  disabled?: boolean;
}

export function IoTPanel({ contractId, disabled }: IoTPanelProps) {
  const t = useTranslations("emulator");
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IoTFormData>({
    resolver: zodResolver(iotSchema) as never,
    defaultValues: { ndvi_index: 0.7, soil_moisture: 45 },
  });

  const mutation = useMutation({
    mutationFn: (data: IoTFormData) =>
      apiPost("/api/data/iot", {
        contract_id: contractId,
        ...data,
      }),
    onSuccess: () => {
      toast.success(t("iot.success"));
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("error"));
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-text-secondary">
          {t("iot.title")}
        </CardTitle>
        <Cpu className="h-4 w-4 text-text-muted" />
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit((data: IoTFormData) => mutation.mutate(data))}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ndvi" className="text-xs">
                <Leaf className="mr-1 inline h-3 w-3" />
                {t("iot.ndvi")}
              </Label>
              <Input
                id="ndvi"
                type="number"
                step="0.01"
                {...register("ndvi_index")}
                error={!!errors.ndvi_index}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="moisture" className="text-xs">
                <Droplets className="mr-1 inline h-3 w-3" />
                {t("iot.soilMoisture")}
              </Label>
              <Input
                id="moisture"
                type="number"
                step="0.1"
                {...register("soil_moisture")}
                error={!!errors.soil_moisture}
                disabled={disabled}
              />
            </div>
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={mutation.isPending || disabled}
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : mutation.isSuccess ? (
              <Check className="mr-2 h-4 w-4" />
            ) : null}
            {t("iot.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
