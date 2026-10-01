import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

/** The requester is never an input: it is the authenticated user. */
@InputType('GroupInvitationCodeGenerateRequestDto')
export class GroupInvitationCodeGenerateRequestDto {
  @Field(() => ID)
  @IsString()
  groupId!: string;
}
