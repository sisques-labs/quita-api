import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType('PaymentDeleteRequestDto')
export class PaymentDeleteRequestDto {
  @Field(() => ID)
  @IsString()
  groupId!: string;

  @Field(() => ID)
  @IsString()
  paymentId!: string;
}
