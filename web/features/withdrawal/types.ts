export interface Withdrawal {
  id: string;
  amount: number;
  bankName: string;
  accountLast4: string;
  timestamp: string;
  status: "completed";
}
