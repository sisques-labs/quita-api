import { EditPaymentCommand } from '@contexts/payments/application/commands/edit-payment/edit-payment.command';
import { EditPaymentHandler } from '@contexts/payments/application/commands/edit-payment/edit-payment.handler';
import { GroupMembersPort } from '@contexts/payments/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member.service';
import { AssertPaymentExistsService } from '@contexts/payments/application/services/write/assert-payment-exists.service';
import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentBuilder } from '@contexts/payments/domain/builders/payment.builder';
import { PaymentAccessDeniedException } from '@contexts/payments/domain/exceptions/payment-access-denied.exception';
import { PaymentAlreadyDeletedException } from '@contexts/payments/domain/exceptions/payment-already-deleted.exception';
import { PaymentDateInFutureException } from '@contexts/payments/domain/exceptions/payment-date-in-future.exception';
import { PaymentNotFoundException } from '@contexts/payments/domain/exceptions/payment-not-found.exception';
import { PaymentPartiesMustDifferException } from '@contexts/payments/domain/exceptions/payment-parties-must-differ.exception';
import { PaymentPartyNotMemberException } from '@contexts/payments/domain/exceptions/payment-party-not-member.exception';
import { PaymentWriteRepository } from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { ClockPort } from '@core/clock/domain/clock.port';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const TODAY = '2026-09-30';

const command = (
  changes: Record<string, unknown> = {},
  requesterId = 'user_b',
) =>
  new EditPaymentCommand({
    paymentId: ID,
    groupId: GROUP_ID,
    requesterId,
    ...changes,
  });

const activePayment = () =>
  new PaymentBuilder()
    .withId(ID)
    .withGroupId(GROUP_ID)
    .withFromUserId('user_a')
    .withToUserId('user_b')
    .withAmountCents(1000)
    .withPaidOn('2026-09-29')
    .withCreatedBy('user_a')
    .build();

describe('EditPaymentHandler', () => {
  let repository: Mocked<PaymentWriteRepository>;
  let membersPort: Mocked<GroupMembersPort>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let assertExists: Mocked<AssertPaymentExistsService>;
  let clock: Mocked<ClockPort>;
  let eventBus: Mocked<EventBus>;
  let handler: EditPaymentHandler;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCriteria: vi.fn(),
      save: vi.fn().mockImplementation(async (p: PaymentAggregate) => p),
      delete: vi.fn(),
    };
    membersPort = { isMember: vi.fn().mockResolvedValue(true) };
    assertMember = {
      execute: vi.fn(),
    } as unknown as Mocked<AssertRequesterIsGroupMemberService>;
    assertExists = {
      execute: vi.fn().mockResolvedValue(activePayment()),
    } as unknown as Mocked<AssertPaymentExistsService>;
    clock = { today: vi.fn().mockReturnValue(TODAY) };
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new EditPaymentHandler(
      repository,
      membersPort,
      assertMember,
      assertExists,
      clock,
      eventBus,
    );
  });

  it('lets another member change the amount and records them as editor', async () => {
    await handler.execute(command({ amountCents: 2000 }));

    expect(assertMember.execute).toHaveBeenCalledWith(GROUP_ID, 'user_b');
    expect(assertExists.execute).toHaveBeenCalledWith(ID, GROUP_ID);
    const saved = repository.save.mock.calls[0][0];
    expect(saved.toPrimitives()).toMatchObject({
      amountCents: 2000,
      fromUserId: 'user_a',
      toUserId: 'user_b',
      createdBy: 'user_a',
      updatedBy: 'user_b',
    });
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('changes the note, and can clear it', async () => {
    await handler.execute(command({ note: 'Rent' }));
    expect(repository.save.mock.calls[0][0].toPrimitives().note).toBe('Rent');

    await handler.execute(command({ note: null }));
    expect(repository.save.mock.calls[1][0].toPrimitives().note).toBeNull();
  });

  it('rejects an invalid amount or date when the command is built', () => {
    expect(() => command({ amountCents: 0 })).toThrow();
    expect(() => command({ paidOn: 'nope' })).toThrow();
  });

  it('rejects a future date from the clock and does not save', async () => {
    await expect(
      handler.execute(command({ paidOn: '2026-10-01' })),
    ).rejects.toThrow(PaymentDateInFutureException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('accepts today as the new date', async () => {
    await handler.execute(command({ paidOn: TODAY }));
    expect(repository.save.mock.calls[0][0].toPrimitives().paidOn).toBe(TODAY);
  });

  it('rejects editing a deleted payment', async () => {
    const deleted = activePayment();
    deleted.delete('user_a', new Date('2026-09-30T08:00:00Z'));
    assertExists.execute.mockResolvedValue(deleted);

    await expect(handler.execute(command({ amountCents: 1 }))).rejects.toThrow(
      PaymentAlreadyDeletedException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('checks a party is a member only when that party changes', async () => {
    await handler.execute(command({ amountCents: 300 }));
    expect(membersPort.isMember).not.toHaveBeenCalled();

    await handler.execute(
      command({ fromUserId: 'user_b', toUserId: 'user_a' }),
    );
    expect(membersPort.isMember).toHaveBeenCalledWith(GROUP_ID, 'user_b');
    expect(membersPort.isMember).toHaveBeenCalledWith(GROUP_ID, 'user_a');
    expect(repository.save.mock.calls[1][0].toPrimitives()).toMatchObject({
      fromUserId: 'user_b',
      toUserId: 'user_a',
    });
  });

  it('rejects a new party who is not a member', async () => {
    membersPort.isMember.mockResolvedValue(false);

    await expect(
      handler.execute(command({ toUserId: 'stranger' })),
    ).rejects.toThrow(PaymentPartyNotMemberException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('rejects an edit that makes both parties the same member', async () => {
    await expect(
      handler.execute(command({ toUserId: 'user_a' })),
    ).rejects.toThrow(PaymentPartiesMustDifferException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('denies a non-member without loading the payment', async () => {
    assertMember.execute.mockRejectedValue(
      new PaymentAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      handler.execute(command({ amountCents: 5 }, 'stranger')),
    ).rejects.toThrow(PaymentAccessDeniedException);
    expect(assertExists.execute).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('propagates not found for an unknown payment', async () => {
    assertExists.execute.mockRejectedValue(new PaymentNotFoundException(ID));

    await expect(handler.execute(command({ amountCents: 5 }))).rejects.toThrow(
      PaymentNotFoundException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
