import { IGroupMemberPrimitives } from '@contexts/group-members/domain/primitives/group-member.primitives';
import { BasePrimitives } from '@sisques-labs/nestjs-kit';

/** `id` is the group id: one roster per group. */
export type IGroupMembershipPrimitives = BasePrimitives & {
  capacity: number;
  version: number;
  members: IGroupMemberPrimitives[];
};
