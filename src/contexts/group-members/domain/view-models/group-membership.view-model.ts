import { IGroupMemberPrimitives } from '@contexts/group-members/domain/primitives/group-member.primitives';
import { IGroupMembershipPrimitives } from '@contexts/group-members/domain/primitives/group-membership.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/**
 * Read-side projection of a roster; `id` is the group id. It deliberately
 * does not expose the optimistic-lock `version` of the aggregate.
 */
export class GroupMembershipViewModel extends BaseViewModel {
  readonly capacity: number;
  readonly members: IGroupMemberPrimitives[];

  constructor(props: Omit<IGroupMembershipPrimitives, 'version'>) {
    super(props.id, props.createdAt, props.updatedAt);
    this.capacity = props.capacity;
    this.members = props.members;
  }
}
