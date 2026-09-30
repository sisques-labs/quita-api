import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';

export const GROUP_MEMBERSHIP_READ_REPOSITORY = Symbol(
  'GROUP_MEMBERSHIP_READ_REPOSITORY',
);

/**
 * Query-only view over the roster tables. It deliberately does not extend
 * `IBaseReadRepository`: there is no separate projection store, so the base
 * `save` / `delete` / `findByCriteria` would have no meaning here.
 */
export interface GroupMembershipReadRepository {
  findByGroupId(groupId: string): Promise<GroupMembershipViewModel | null>;
  isMember(groupId: string, userId: string): Promise<boolean>;
  findGroupIdsByUserId(userId: string): Promise<string[]>;
}
