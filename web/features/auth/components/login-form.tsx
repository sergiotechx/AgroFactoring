"use client";

import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { AlertTriangle, Loader2, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAuth } from "../hooks/use-auth";
import { loginSchema, type LoginFormData } from "../schemas/login-schema";

export function LoginForm() {
  const t = useTranslations("login");
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login.mutateAsync(data);
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <Card className="w-full max-w-md border-0 shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4">
          <Image
            src="/logo-full.png"
            alt="AgroFactoring"
            width={360}
            height={120}
            className="h-24 w-auto"
            priority
          />
        </div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-text-secondary">{t("subtitle")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {login.error && (
            <div className="flex items-start gap-2 rounded-md bg-danger/10 p-3 text-sm text-danger">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {login.error.message === "Credenciales invalidas" ||
                login.error.message === "Invalid credentials"
                  ? t("errors.invalidCredentials")
                  : t("errors.serverError")}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">{t("username")}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                id="username"
                placeholder={t("usernamePlaceholder")}
                className="pl-10"
                error={!!errors.username}
                {...register("username")}
              />
            </div>
            {errors.username && (
              <p className="text-xs text-danger">
                {t("errors.usernameRequired")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <Input
                id="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                className="pl-10"
                error={!!errors.password}
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-danger">
                {t("errors.passwordRequired")}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={login.isPending}
          >
            {login.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              t("submit")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
