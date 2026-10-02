import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('MemberBalanceResponseDto')
export class MemberBalanceResponseDto {
  @Field(() => String)
  userId!: string;

  @Field(() => Int, {
    description:
      'Positive when the member is owed money, negative when they owe',
  })
  netCents!: number;
}

@ObjectType('BalanceDebtResponseDto')
export class BalanceDebtResponseDto {
  @Field(() => String, { description: 'The member who owes' })
  fromUserId!: string;

  @Field(() => String, { description: 'The member who is owed' })
  toUserId!: string;

  @Field(() => Int)
  amountCents!: number;
}

@ObjectType('GroupBalanceResponseDto')
export class GroupBalanceResponseDto {
  @Field(() => ID)
  groupId!: string;

  @Field(() => String)
  currency!: string;

  @Field(() => Boolean, { description: 'True when nobody owes anything' })
  settled!: boolean;

  @Field(() => [MemberBalanceResponseDto])
  memberBalances!: MemberBalanceResponseDto[];

  @Field(() => [BalanceDebtResponseDto], {
    description:
      'Empty when settled; otherwise a single debt between the two members',
  })
  debts!: BalanceDebtResponseDto[];
}
