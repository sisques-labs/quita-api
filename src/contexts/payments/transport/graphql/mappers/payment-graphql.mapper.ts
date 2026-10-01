import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { PaginatedPaymentResultObject } from '@contexts/payments/transport/graphql/objects/paginated-payment-result.object';
import { PaymentObject } from '@contexts/payments/transport/graphql/objects/payment.object';
import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

@Injectable()
export class PaymentGraphQLMapper {
  toObject(viewModel: PaymentViewModel): PaymentObject {
    return {
      id: viewModel.id,
      groupId: viewModel.groupId,
      fromUserId: viewModel.fromUserId,
      toUserId: viewModel.toUserId,
      amountCents: viewModel.amountCents,
      currency: viewModel.currency,
      paidOn: viewModel.paidOn,
      note: viewModel.note,
      createdBy: viewModel.createdBy,
      updatedBy: viewModel.updatedBy,
      createdAt: viewModel.createdAt,
      updatedAt: viewModel.updatedAt,
      deletedAt: viewModel.deletedAt,
    };
  }

  toPaginated(
    result: PaginatedResult<PaymentViewModel>,
  ): PaginatedPaymentResultObject {
    return {
      items: result.items.map((item) => this.toObject(item)),
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    };
  }
}
