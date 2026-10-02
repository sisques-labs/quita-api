import { CreatePaymentCommand } from '@contexts/payments/application/commands/create-payment/create-payment.command';
import { CreatePaymentHandler } from '@contexts/payments/application/commands/create-payment/create-payment.handler';
import { GroupMembersPort } from '@contexts/payments/application/ports/group-members.port';
import { AssertRequesterIsGroupMemberService } from '@contexts/payments/application/services/read/assert-requester-is-group-member/assert-requester-is-group-member.service';
import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentAccessDeniedException } from '@contexts/payments/domain/exceptions/payment-access-denied.exception';
import { PaymentDateInFutureException } from '@contexts/payments/domain/exceptions/payment-date-in-future.exception';
import { PaymentPartiesMustDifferException } from '@contexts/payments/domain/exceptions/payment-parties-must-differ.exception';
import { PaymentPartyNotMemberException } from '@contexts/payments/domain/exceptions/payment-party-not-member.exception';
import { IPaymentWriteRepository } from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { ClockPort } from '@core/clock/domain/clock.port';
import { EventBus } from '@nestjs/cqrs';
import { Mocked } from 'vitest';

const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';
const TODAY = '2026-09-30';

const input = (overrides: Record<string, unknown> = {}) => ({
  groupId: GROUP_ID,
  requesterId: 'user_a',
  fromUserId: 'user_a',
  toUserId: 'user_b',
  amountCents: 1000,
  paidOn: TODAY,
  ...overrides,
});

describe('CreatePaymentHandler', () => {
  let repository: Mocked<IPaymentWriteRepository>;
  let membersPort: Mocked<GroupMembersPort>;
  let assertMember: Mocked<AssertRequesterIsGroupMemberService>;
  let clock: Mocked<ClockPort>;
  let eventBus: Mocked<EventBus>;
  let handler: CreatePaymentHandler;

  const savedPayment = (): PaymentAggregate =>
    repository.save.mock.calls[0][0] as PaymentAggregate;

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
    clock = { today: vi.fn().mockReturnValue(TODAY) };
    eventBus = { publishAll: vi.fn() } as unknown as Mocked<EventBus>;
    handler = new CreatePaymentHandler(
      repository,
      membersPort,
      assertMember,
      clock,
      eventBus,
    );
  });

  it('records the payment, defaults to EUR with no note, and publishes its event', async () => {
    const id = await handler.execute(new CreatePaymentCommand(input()));

    expect(assertMember.execute).toHaveBeenCalledWith(
      expect.objectContaining({ value: GROUP_ID }),
      expect.objectContaining({ value: 'user_a' }),
    );
    expect(savedPayment().toPrimitives()).toMatchObject({
      id,
      groupId: GROUP_ID,
      fromUserId: 'user_a',
      toUserId: 'user_b',
      amountCents: 1000,
      currency: 'EUR',
      paidOn: TODAY,
      note: null,
      createdBy: 'user_a',
      updatedBy: 'user_a',
      deletedAt: null,
    });
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
  });

  it('lets a member record a payment between the two parties in either direction, with a note', async () => {
    await handler.execute(
      new CreatePaymentCommand(
        input({
          fromUserId: 'user_b',
          toUserId: 'user_a',
          note: 'Rent',
          paidOn: '2026-09-29',
        }),
      ),
    );

    expect(savedPayment().toPrimitives()).toMatchObject({
      fromUserId: 'user_b',
      toUserId: 'user_a',
      createdBy: 'user_a',
      note: 'Rent',
      paidOn: '2026-09-29',
    });
  });

  it('rejects an invalid amount, date or blank party when the command is built', () => {
    expect(() => new CreatePaymentCommand(input({ amountCents: 0 }))).toThrow();
    expect(
      () => new CreatePaymentCommand(input({ amountCents: -5 })),
    ).toThrow();
    expect(
      () => new CreatePaymentCommand(input({ amountCents: 10.5 })),
    ).toThrow();
    expect(() => new CreatePaymentCommand(input({ paidOn: 'nope' }))).toThrow();
    expect(() => new CreatePaymentCommand(input({ toUserId: '' }))).toThrow();
  });

  it('rejects a payment from a member to themselves and saves nothing', async () => {
    await expect(
      handler.execute(new CreatePaymentCommand(input({ toUserId: 'user_a' }))),
    ).rejects.toThrow(PaymentPartiesMustDifferException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('rejects a future date using the clock and saves nothing', async () => {
    await expect(
      handler.execute(
        new CreatePaymentCommand(input({ paidOn: '2026-10-01' })),
      ),
    ).rejects.toThrow(PaymentDateInFutureException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(eventBus.publishAll).not.toHaveBeenCalled();
  });

  it('accepts today and yesterday', async () => {
    await handler.execute(new CreatePaymentCommand(input({ paidOn: TODAY })));
    await handler.execute(
      new CreatePaymentCommand(input({ paidOn: '2026-09-29' })),
    );
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['payer', { fromUserId: 'stranger' }, 'stranger'],
    ['payee', { toUserId: 'stranger' }, 'stranger'],
  ])('rejects a %s who is not a member', async (_label, overrides, who) => {
    membersPort.isMember.mockImplementation(
      async (_group, user) => user !== who,
    );

    await expect(
      handler.execute(new CreatePaymentCommand(input(overrides))),
    ).rejects.toThrow(PaymentPartyNotMemberException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('denies a non-member requester before anything else', async () => {
    assertMember.execute.mockRejectedValue(
      new PaymentAccessDeniedException('stranger', GROUP_ID),
    );

    await expect(
      handler.execute(
        new CreatePaymentCommand(input({ requesterId: 'stranger' })),
      ),
    ).rejects.toThrow(PaymentAccessDeniedException);
    expect(membersPort.isMember).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });
});
