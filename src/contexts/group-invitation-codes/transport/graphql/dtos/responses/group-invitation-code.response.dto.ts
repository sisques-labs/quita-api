import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('GroupInvitationCode')
export class GroupInvitationCodeObject {
  @Field(() => ID)
  groupId!: string;

  @Field(() => String)
  code!: string;
}
