"use client";

import { useState, useCallback, useEffect } from "react";
import type { Withdrawal } from "../types";

function getStorageKey(contractId: string) {
  return `af_withdrawals_${contractId}`;
}

function readWithdrawals(contractId: string): Withdrawal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getStorageKey(contractId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeWithdrawals(contractId: string, withdrawals: Withdrawal[]) {
  localStorage.setItem(getStorageKey(contractId), JSON.stringify(withdrawals));
}

export function useWithdrawals(contractId: string) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  useEffect(() => {
    setWithdrawals(readWithdrawals(contractId));
  }, [contractId]);

  const totalWithdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

  const withdraw = useCallback(
    (amount: number, bankName: string, accountLast4: string) => {
      const entry: Withdrawal = {
        id: crypto.randomUUID(),
        amount,
        bankName,
        accountLast4,
        timestamp: new Date().toISOString(),
        status: "completed",
      };

      const updated = [entry, ...readWithdrawals(contractId)];
      writeWithdrawals(contractId, updated);
      setWithdrawals(updated);

      return entry;
    },
    [contractId]
  );

  return { withdrawals, totalWithdrawn, withdraw };
}
