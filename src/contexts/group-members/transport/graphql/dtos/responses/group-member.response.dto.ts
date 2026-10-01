import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('GroupMember')
export class GroupMemberObject {
  @Field(() => String)
  userId!: string;

  @Field(() => GroupMemberRole)
  role!: GroupMemberRole;

  @Field(() => Date)
  joinedAt!: Date;
}
