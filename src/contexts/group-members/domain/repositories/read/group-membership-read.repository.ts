import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { IBaseReadRepository } from '@sisques-labs/nestjs-kit';

export const GROUP_MEMBERSHIP_READ_REPOSITORY = Symbol(
  'GROUP_MEMBERSHIP_READ_REPOSITORY',
);

/**
 * Query view over the roster tables. There is no separate projection store,
 * so `save` / `delete` are no-ops (the write side persists). A roster is
 * addressed by its group id: `findById(id)` takes the group id and
 * `findByCriteria` is not supported (it throws).
 */
export interface IGroupMembershipReadRepository extends IBaseReadRepository<GroupMembershipViewModel> {
  findByGroupId(groupId: string): Promise<GroupMembershipViewModel | null>;
  isMember(groupId: string, userId: string): Promise<boolean>;
  findGroupIdsByUserId(userId: string): Promise<string[]>;
}
