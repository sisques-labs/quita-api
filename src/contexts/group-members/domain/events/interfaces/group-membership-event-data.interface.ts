import { IGroupMembershipPrimitives } from '@contexts/group-members/domain/primitives/group-membership.primitives';
import { IBaseEventData } from '@sisques-labs/nestjs-kit';

export type IGroupMembershipEventData = IGroupMembershipPrimitives &
  IBaseEventData;
