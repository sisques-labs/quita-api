import { PaymentsFindActiveByGroupQuery } from '@contexts/payments/application/queries/payments-find-active-by-group/payments-find-active-by-group.query';
import {
  PAYMENT_READ_REPOSITORY,
  PaymentReadRepository,
} from '@contexts/payments/domain/repositories/read/payment-read.repository';
import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

@QueryHandler(PaymentsFindActiveByGroupQuery)
export class PaymentsFindActiveByGroupHandler implements IQueryHandler<
  PaymentsFindActiveByGroupQuery,
  PaymentViewModel[]
> {
  private readonly logger = new Logger(PaymentsFindActiveByGroupHandler.name);

  constructor(
    @Inject(PAYMENT_READ_REPOSITORY)
    private readonly repository: PaymentReadRepository,
  ) {}

  async execute(
    query: PaymentsFindActiveByGroupQuery,
  ): Promise<PaymentViewModel[]> {
    this.logger.log(`Finding active payments of group ${query.groupId.value}`);
    return this.repository.findActiveByGroupId(query.groupId.value);
  }
}
