import { GroupMemberPrimitives } from '@contexts/group-members/domain/primitives/group-member.primitives';
import { BaseViewModel } from '@sisques-labs/nestjs-kit';

/** Read-side projection of a roster; `id` is the group id. */
export class GroupMembershipViewModel extends BaseViewModel {
  constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    readonly capacity: number,
    readonly members: GroupMemberPrimitives[],
  ) {
    super(id, createdAt, updatedAt);
  }
}
