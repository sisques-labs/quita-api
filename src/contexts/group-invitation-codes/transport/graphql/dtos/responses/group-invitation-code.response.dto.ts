import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('GroupInvitationCodeResponseDto')
export class GroupInvitationCodeResponseDto {
  @Field(() => ID)
  groupId!: string;

  @Field(() => String)
  code!: string;
}
