import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Payment')
export class PaymentObject {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  groupId!: string;

  @Field(() => String)
  fromUserId!: string;

  @Field(() => String)
  toUserId!: string;

  @Field(() => Int)
  amountCents!: number;

  @Field(() => String)
  currency!: string;

  @Field(() => String, { description: 'Date-only YYYY-MM-DD' })
  paidOn!: string;

  @Field(() => String, { nullable: true })
  note!: string | null;

  @Field(() => String)
  createdBy!: string;

  @Field(() => String)
  updatedBy!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;

  @Field(() => Date, {
    nullable: true,
    description: 'Set when the payment was soft-deleted',
  })
  deletedAt!: Date | null;
}
