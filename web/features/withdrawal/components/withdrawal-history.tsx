"use client";

import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatUSDC, formatDate } from "@/lib/format";
import Image from "next/image";
import { useWithdrawals } from "../hooks/use-withdrawals";

interface WithdrawalHistoryProps {
  contractId: string;
}

export function WithdrawalHistory({ contractId }: WithdrawalHistoryProps) {
  const t = useTranslations("withdrawal");
  const { withdrawals } = useWithdrawals(contractId);

  if (withdrawals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <Image src="/wallet.png" alt="" width={80} height={80} className="object-contain mb-1" />
          <p className="text-sm text-text-muted">{t("history.empty")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">{t("history.title")}</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("history.date")}</TableHead>
            <TableHead className="text-right">{t("history.amount")}</TableHead>
            <TableHead>{t("history.bank")}</TableHead>
            <TableHead>{t("history.account")}</TableHead>
            <TableHead>{t("history.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {withdrawals.map((w) => (
            <TableRow key={w.id}>
              <TableCell className="text-text-secondary text-sm">
                {formatDate(w.timestamp)}
              </TableCell>
              <TableCell className="text-right tabular-nums font-medium">
                {formatUSDC(w.amount)}
              </TableCell>
              <TableCell>{w.bankName}</TableCell>
              <TableCell className="font-mono text-sm">****{w.accountLast4}</TableCell>
              <TableCell>
                <Badge variant="success" className="text-xs">
                  {t("history.completed")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
