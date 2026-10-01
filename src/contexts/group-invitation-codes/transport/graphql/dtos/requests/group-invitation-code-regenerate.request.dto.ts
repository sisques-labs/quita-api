import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType('GroupInvitationCodeRegenerateRequestDto')
export class GroupInvitationCodeRegenerateRequestDto {
  @Field(() => ID)
  @IsString()
  groupId!: string;
}
