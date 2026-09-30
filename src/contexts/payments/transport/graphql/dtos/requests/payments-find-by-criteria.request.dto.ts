import { PaymentFilterInput } from '@contexts/payments/transport/graphql/dtos/requests/payment-filter.input';
import { PaymentSortInput } from '@contexts/payments/transport/graphql/dtos/requests/payment-sort.input';
import { Field, InputType } from '@nestjs/graphql';
import { BaseFindByCriteriaInput } from '@sisques-labs/nestjs-kit/graphql';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

/** The group and requester are separate arguments, never part of the criteria. */
@InputType('PaymentsFindByCriteriaRequestDto')
export class PaymentsFindByCriteriaRequestDto extends BaseFindByCriteriaInput {
  @Field(() => [PaymentFilterInput], { nullable: true, defaultValue: [] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentFilterInput)
  declare filters?: PaymentFilterInput[];

  @Field(() => [PaymentSortInput], { nullable: true, defaultValue: [] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentSortInput)
  declare sorts?: PaymentSortInput[];
}
