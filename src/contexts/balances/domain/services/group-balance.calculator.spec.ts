import { BalanceSplitType } from '@contexts/balances/domain/enums/balance-split-type.enum';
import { BalanceParticipantUnknownException } from '@contexts/balances/domain/exceptions/balance-participant-unknown.exception';
import { GroupNotReadyException } from '@contexts/balances/domain/exceptions/group-not-ready.exception';
import {
  BalanceExpenseEntry,
  BalancePaymentEntry,
} from '@contexts/balances/domain/interfaces/balance-entries.interface';
import { GroupBalanceCalculator } from '@contexts/balances/domain/services/group-balance.calculator';

const A = 'user_a';
const B = 'user_b';
const GROUP_ID = '5d1c8f0a-3f55-4b6a-8a27-3a8d3b0d7e22';

const expense = (
  amountCents: number,
  paidBy: string,
  splitType: BalanceSplitType = BalanceSplitType.EQUAL,
): BalanceExpenseEntry => ({ amountCents, paidBy, splitType });

const payment = (
  fromUserId: string,
  toUserId: string,
  amountCents: number,
): BalancePaymentEntry => ({ fromUserId, toUserId, amountCents });

/** Deterministic PRNG (mulberry32) so the property runs are reproducible. */
const seededRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

describe('GroupBalanceCalculator', () => {
  const calculator = new GroupBalanceCalculator();
  const calculate = (
    expenses: BalanceExpenseEntry[],
    payments: BalancePaymentEntry[] = [],
  ) =>
    calculator.calculate({
      groupId: GROUP_ID,
      memberIds: [A, B],
      expenses,
      payments,
    });

  it('is settled with no activity', () => {
    const result = calculate([]);

    expect(result.settled).toBe(true);
    expect(result.debts).toEqual([]);
    expect(result.memberBalances).toEqual([
      { userId: A, netCents: 0 },
      { userId: B, netCents: 0 },
    ]);
  });

  it('EQUAL: the other member owes half of an even amount', () => {
    const result = calculate([expense(1000, A)]);

    expect(result.settled).toBe(false);
    expect(result.debts).toEqual([
      { fromUserId: B, toUserId: A, amountCents: 500 },
    ]);
    expect(result.memberBalances).toEqual([
      { userId: A, netCents: 500 },
      { userId: B, netCents: -500 },
    ]);
  });

  it('EQUAL odd cent (10.01 EUR paid by A): B owes 5.00 EUR and A absorbs the cent', () => {
    const result = calculate([expense(1001, A)]);

    expect(result.debts).toEqual([
      { fromUserId: B, toUserId: A, amountCents: 500 },
    ]);
  });

  it('EQUAL: the roles swap when B is the payer', () => {
    const result = calculate([expense(1001, B)]);

    expect(result.debts).toEqual([
      { fromUserId: A, toUserId: B, amountCents: 500 },
    ]);
  });

  it('EQUAL: a one-cent expense leaves nothing owed', () => {
    const result = calculate([expense(1, A)]);

    expect(result.settled).toBe(true);
    expect(result.debts).toEqual([]);
  });

  it('OTHER_OWES_ALL: the other member owes the full amount', () => {
    const result = calculate([
      expense(1000, A, BalanceSplitType.OTHER_OWES_ALL),
    ]);

    expect(result.debts).toEqual([
      { fromUserId: B, toUserId: A, amountCents: 1000 },
    ]);
  });

  it('nets expenses paid by both members against each other', () => {
    const result = calculate([
      expense(1000, A),
      expense(400, B, BalanceSplitType.OTHER_OWES_ALL),
    ]);

    expect(result.debts).toEqual([
      { fromUserId: B, toUserId: A, amountCents: 100 },
    ]);
  });

  it('a payment settles the debt it covers', () => {
    const result = calculate([expense(1000, A)], [payment(B, A, 500)]);

    expect(result.settled).toBe(true);
    expect(result.debts).toEqual([]);
  });

  it('a partial payment reduces the debt', () => {
    const result = calculate([expense(1000, A)], [payment(B, A, 200)]);

    expect(result.debts).toEqual([
      { fromUserId: B, toUserId: A, amountCents: 300 },
    ]);
  });

  it('an overpayment flips the direction of the debt', () => {
    const result = calculate([expense(1000, A)], [payment(B, A, 700)]);

    expect(result.debts).toEqual([
      { fromUserId: A, toUserId: B, amountCents: 200 },
    ]);
  });

  it('a payment without expenses creates a debt for the payee', () => {
    const result = calculate([], [payment(A, B, 300)]);

    expect(result.debts).toEqual([
      { fromUserId: B, toUserId: A, amountCents: 300 },
    ]);
  });

  it('keeps the member order it was given', () => {
    const result = calculator.calculate({
      groupId: GROUP_ID,
      memberIds: [B, A],
      expenses: [expense(1000, A)],
      payments: [],
    });

    expect(result.memberBalances).toEqual([
      { userId: B, netCents: -500 },
      { userId: A, netCents: 500 },
    ]);
  });

  it.each([[[A]], [[A, B, 'user_c']], [[]]])(
    'requires exactly two members (got %j)',
    (memberIds) => {
      expect(() =>
        calculator.calculate({
          groupId: GROUP_ID,
          memberIds,
          expenses: [],
          payments: [],
        }),
      ).toThrow(GroupNotReadyException);
    },
  );

  it('requires two distinct members', () => {
    expect(() =>
      calculator.calculate({
        groupId: GROUP_ID,
        memberIds: [A, A],
        expenses: [],
        payments: [],
      }),
    ).toThrow(GroupNotReadyException);
  });

  it('rejects an expense paid by someone outside the roster', () => {
    expect(() => calculate([expense(1000, 'stranger')])).toThrow(
      BalanceParticipantUnknownException,
    );
  });

  it('rejects a payment whose party is outside the roster', () => {
    expect(() => calculate([], [payment(A, 'stranger', 100)])).toThrow(
      BalanceParticipantUnknownException,
    );
  });

  it('rejects an entry with an invalid amount', () => {
    expect(() => calculate([expense(0, A)])).toThrow();
    expect(() => calculate([], [payment(A, B, 10.5)])).toThrow();
  });

  describe('property: the nets always sum to zero', () => {
    it('holds for 500 generated scenarios and matches the per-entry rules', () => {
      const random = seededRandom(20260930);
      const pick = <T>(items: T[]): T =>
        items[Math.floor(random() * items.length)];

      for (let run = 0; run < 500; run++) {
        const expenseCount = Math.floor(random() * 8);
        const paymentCount = Math.floor(random() * 5);
        const expenses = Array.from({ length: expenseCount }, () =>
          expense(
            1 + Math.floor(random() * 500000),
            pick([A, B]),
            pick([BalanceSplitType.EQUAL, BalanceSplitType.OTHER_OWES_ALL]),
          ),
        );
        const payments = Array.from({ length: paymentCount }, () => {
          const from = pick([A, B]);
          return payment(
            from,
            from === A ? B : A,
            1 + Math.floor(random() * 500000),
          );
        });

        const result = calculate(expenses, payments);

        const total = result.memberBalances.reduce(
          (sum, member) => sum + member.netCents,
          0,
        );
        expect(total).toBe(0);

        let expectedA = 0;
        for (const e of expenses) {
          const owed =
            e.splitType === BalanceSplitType.EQUAL
              ? Math.floor(e.amountCents / 2)
              : e.amountCents;
          expectedA += e.paidBy === A ? owed : -owed;
        }
        for (const p of payments) {
          expectedA += p.fromUserId === A ? p.amountCents : -p.amountCents;
        }
        expect(result.memberBalances[0].netCents).toBe(expectedA);
        expect(result.settled).toBe(expectedA === 0);
        expect(result.debts).toHaveLength(expectedA === 0 ? 0 : 1);
      }
    });

    it('a single EQUAL expense makes the non-payer owe exactly floor(amount/2)', () => {
      const random = seededRandom(7);

      for (let run = 0; run < 300; run++) {
        const amount = 1 + Math.floor(random() * 1000000);
        const result = calculate([expense(amount, A)]);
        const owed = Math.floor(amount / 2);

        expect(result.memberBalances).toEqual([
          { userId: A, netCents: owed },
          { userId: B, netCents: -owed },
        ]);
      }
    });
  });
});
