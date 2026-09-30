import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

/** The requester is never an input: it is the authenticated user. */
@InputType('GenerateInvitationCodeInput')
export class GenerateInvitationCodeInput {
  @Field(() => ID)
  @IsString()
  groupId!: string;
}

@InputType('RegenerateInvitationCodeInput')
export class RegenerateInvitationCodeInput {
  @Field(() => ID)
  @IsString()
  groupId!: string;
}

@InputType('RedeemInvitationCodeInput')
export class RedeemInvitationCodeInput {
  @Field(() => String)
  @IsString()
  code!: string;
}
