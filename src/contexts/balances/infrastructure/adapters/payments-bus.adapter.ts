import { PaymentsPort } from '@contexts/balances/application/ports/payments.port';
import { BalancePaymentEntry } from '@contexts/balances/domain/interfaces/balance-entries.interface';
import { PaymentsFindActiveByGroupQuery } from '@contexts/payments/application/queries/payments-find-active-by-group/payments-find-active-by-group.query';
import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

/**
 * Anti-corruption seam towards payments: reads the public active-payments
 * query and translates the rows into balances' own entry type.
 */
@Injectable()
export class PaymentsBusAdapter implements PaymentsPort {
  constructor(private readonly queryBus: QueryBus) {}

  async listActivePayments(groupId: string): Promise<BalancePaymentEntry[]> {
    const payments = await this.queryBus.execute<
      PaymentsFindActiveByGroupQuery,
      PaymentViewModel[]
    >(new PaymentsFindActiveByGroupQuery({ groupId }));

    return payments.map((payment) => ({
      fromUserId: payment.fromUserId,
      toUserId: payment.toUserId,
      amountCents: payment.amountCents,
    }));
  }
}
