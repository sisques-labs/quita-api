import { DeletePaymentCommand } from '@contexts/payments/application/commands/delete-payment/delete-payment.command';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { AssertPaymentExistsService } from '@contexts/payments/application/services/write/assert-payment-exists/assert-payment-exists.service';
import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import {
  PAYMENT_WRITE_REPOSITORY,
  PaymentWriteRepository,
} from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';

/** Soft delete: any member may delete any active payment; the row is kept. */
@CommandHandler(DeletePaymentCommand)
export class DeletePaymentHandler
  extends BaseCommandHandler<DeletePaymentCommand, PaymentAggregate>
  implements ICommandHandler<DeletePaymentCommand, string>
{
  private readonly logger = new Logger(DeletePaymentHandler.name);

  constructor(
    @Inject(PAYMENT_WRITE_REPOSITORY)
    private readonly repository: PaymentWriteRepository,
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    private readonly assertPaymentExists: AssertPaymentExistsService,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: DeletePaymentCommand): Promise<string> {
    await this.assertRequesterIsMember.execute(
      command.groupId,
      command.requesterId,
    );

    const payment = await this.assertPaymentExists.execute(
      command.paymentId,
      command.groupId,
    );
    payment.delete(command.requesterId.value, new Date());

    await this.repository.save(payment);
    await this.publishEvents(payment);

    this.logger.log(
      `Payment ${payment.id.value} deleted by ${command.requesterId.value}`,
    );
    return payment.id.value;
  }
}
