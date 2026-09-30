import { IGroupMembershipEventData } from '@contexts/group-members/domain/events/interfaces/group-membership-event-data.interface';
import { BaseEvent } from '@sisques-labs/nestjs-kit';

export class GroupMembershipCreatedEvent extends BaseEvent<IGroupMembershipEventData> {}
