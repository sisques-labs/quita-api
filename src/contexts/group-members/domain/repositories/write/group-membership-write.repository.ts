import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const GROUP_MEMBERSHIP_WRITE_REPOSITORY = Symbol(
  'GROUP_MEMBERSHIP_WRITE_REPOSITORY',
);

/**
 * `findById` / `delete` take the group id. `save` is guarded by the
 * aggregate `version` and throws `GroupMembershipConcurrencyException` when
 * the stored roster moved on since it was loaded.
 */
export type IGroupMembershipWriteRepository =
  IBaseWriteRepository<GroupMembershipAggregate>;
