import { BasePrimitives } from '@sisques-labs/nestjs-kit';

export type PaymentPrimitives = BasePrimitives & {
  groupId: string;
  /** Member who paid. */
  fromUserId: string;
  /** Member who received the money. */
  toUserId: string;
  amountCents: number;
  currency: string;
  /** Date-only `YYYY-MM-DD`. */
  paidOn: string;
  note: string | null;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
};
