import { IGroupInvitationCodeEventData } from '@contexts/group-invitation-codes/domain/events/interfaces/group-invitation-code-event-data.interface';
import { BaseEvent } from '@sisques-labs/nestjs-kit';

export class GroupInvitationCodeRevokedEvent extends BaseEvent<IGroupInvitationCodeEventData> {}
