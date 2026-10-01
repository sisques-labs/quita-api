import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { registerEnumType } from '@nestjs/graphql';

registerEnumType(GroupMemberRole, {
  name: 'GroupMemberRole',
  description: 'Role of a user inside a group',
});
