import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { PaginatedPaymentResultDto } from '@contexts/payments/transport/graphql/dtos/responses/payment.response.dto';
import { PaymentResponseDto } from '@contexts/payments/transport/graphql/dtos/responses/payment.response.dto';
import { Injectable } from '@nestjs/common';
import { PaginatedResult } from '@sisques-labs/nestjs-kit';

@Injectable()
export class PaymentGraphQLMapper {
  toResponseDtoFromViewModel(viewModel: PaymentViewModel): PaymentResponseDto {
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

  toPaginatedResponseDto(
    result: PaginatedResult<PaymentViewModel>,
  ): PaginatedPaymentResultDto {
    return {
      items: result.items.map((item) => this.toResponseDtoFromViewModel(item)),
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    };
  }
}
