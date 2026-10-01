import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('MemberBalance')
export class MemberBalanceObject {
  @Field(() => String)
  userId!: string;

  @Field(() => Int, {
    description:
      'Positive when the member is owed money, negative when they owe',
  })
  netCents!: number;
}

@ObjectType('BalanceDebt')
export class BalanceDebtObject {
  @Field(() => String, { description: 'The member who owes' })
  fromUserId!: string;

  @Field(() => String, { description: 'The member who is owed' })
  toUserId!: string;

  @Field(() => Int)
  amountCents!: number;
}

@ObjectType('GroupBalance')
export class GroupBalanceObject {
  @Field(() => ID)
  groupId!: string;

  @Field(() => String)
  currency!: string;

  @Field(() => Boolean, { description: 'True when nobody owes anything' })
  settled!: boolean;

  @Field(() => [MemberBalanceObject])
  memberBalances!: MemberBalanceObject[];

  @Field(() => [BalanceDebtObject], {
    description:
      'Empty when settled; otherwise a single debt between the two members',
  })
  debts!: BalanceDebtObject[];
}
