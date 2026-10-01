import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { EnumValueObject } from '@sisques-labs/nestjs-kit';

export class GroupMemberRoleValueObject extends EnumValueObject<
  typeof GroupMemberRole
> {
  protected get enumObject(): typeof GroupMemberRole {
    return GroupMemberRole;
  }
}
