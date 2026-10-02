import { EditPaymentCommand } from '@contexts/payments/application/commands/edit-payment/edit-payment.command';
import {
  GROUP_MEMBERS_PORT,
  GroupMembersPort,
} from '@contexts/payments/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { AssertPaymentExistsService } from '@contexts/payments/application/services/write/assert-payment-exists/assert-payment-exists.service';
import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentPartyNotMemberException } from '@contexts/payments/domain/exceptions/payment-party-not-member.exception';
import {
  PAYMENT_WRITE_REPOSITORY,
  PaymentWriteRepository,
} from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { CLOCK, ClockPort } from '@core/clock/domain/clock.port';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler } from '@sisques-labs/nestjs-kit';

/** Any member of the group may edit any active payment of that group. */
@CommandHandler(EditPaymentCommand)
export class EditPaymentHandler
  extends BaseCommandHandler<EditPaymentCommand, PaymentAggregate>
  implements ICommandHandler<EditPaymentCommand, string>
{
  private readonly logger = new Logger(EditPaymentHandler.name);

  constructor(
    @Inject(PAYMENT_WRITE_REPOSITORY)
    private readonly repository: PaymentWriteRepository,
    @Inject(GROUP_MEMBERS_PORT)
    private readonly membersPort: GroupMembersPort,
    private readonly assertRequesterIsMember: AssertRequesterIsGroupMemberService,
    private readonly assertPaymentExists: AssertPaymentExistsService,
    @Inject(CLOCK) private readonly clock: ClockPort,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: EditPaymentCommand): Promise<string> {
    const groupId = command.groupId.value;
    await this.assertRequesterIsMember.execute(
      command.groupId,
      command.requesterId,
    );

    const payment = await this.assertPaymentExists.execute(
      command.paymentId,
      command.groupId,
    );

    const { fromUserId, toUserId } = command.changes;
    for (const party of [fromUserId, toUserId]) {
      if (
        party !== undefined &&
        !(await this.membersPort.isMember(groupId, party))
      ) {
        throw new PaymentPartyNotMemberException(party, groupId);
      }
    }

    payment.update(
      command.changes,
      command.requesterId.value,
      this.clock.today(),
    );

    await this.repository.save(payment);
    await this.publishEvents(payment);

    this.logger.log(
      `Payment ${payment.id.value} edited by ${command.requesterId.value}`,
    );
    return payment.id.value;
  }
}
