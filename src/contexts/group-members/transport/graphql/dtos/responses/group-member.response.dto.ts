import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('GroupMemberResponseDto')
export class GroupMemberResponseDto {
  @Field(() => String)
  userId!: string;

  @Field(() => GroupMemberRole)
  role!: GroupMemberRole;

  @Field(() => Date)
  joinedAt!: Date;
}
