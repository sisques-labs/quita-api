import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString } from 'class-validator';

/**
 * Omitted fields keep their value; `note` accepts an explicit `null` to clear
 * it.
 */
@InputType('PaymentEditRequestDto')
export class PaymentEditRequestDto {
  @Field(() => ID)
  @IsString()
  groupId!: string;

  @Field(() => ID)
  @IsString()
  paymentId!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  fromUserId?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  toUserId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  amountCents?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  paidOn?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}
