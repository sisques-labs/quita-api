import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType('GroupInvitationCodeRedeemRequestDto')
export class GroupInvitationCodeRedeemRequestDto {
  @Field(() => String)
  @IsString()
  code!: string;
}
