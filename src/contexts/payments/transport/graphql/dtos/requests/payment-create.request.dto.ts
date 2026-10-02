import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString } from 'class-validator';

/** The requester is never an input: it is the authenticated user. */
@InputType('PaymentCreateRequestDto')
export class PaymentCreateRequestDto {
  @Field(() => ID)
  @IsString()
  groupId!: string;

  @Field(() => String, { description: 'User id of the member who paid' })
  @IsString()
  fromUserId!: string;

  @Field(() => String, { description: 'User id of the member who was paid' })
  @IsString()
  toUserId!: string;

  @Field(() => Int, { description: 'Positive amount in euro cents' })
  @IsInt()
  amountCents!: number;

  @Field(() => String, {
    description: 'Date-only YYYY-MM-DD, today or in the past',
  })
  @IsString()
  paidOn!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  note?: string;
}
