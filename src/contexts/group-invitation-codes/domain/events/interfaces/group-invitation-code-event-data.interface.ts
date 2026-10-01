import { IGroupInvitationCodePrimitives } from '@contexts/group-invitation-codes/domain/primitives/group-invitation-code.primitives';
import { IBaseEventData } from '@sisques-labs/nestjs-kit';

export type IGroupInvitationCodeEventData = IGroupInvitationCodePrimitives &
  IBaseEventData;
