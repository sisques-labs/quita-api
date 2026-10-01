import { GroupMemberPrimitives } from '@contexts/group-members/domain/primitives/group-member.primitives';
import { BasePrimitives } from '@sisques-labs/nestjs-kit';

/** `id` is the group id: one roster per group. */
export type GroupMembershipPrimitives = BasePrimitives & {
  capacity: number;
  version: number;
  members: GroupMemberPrimitives[];
};
