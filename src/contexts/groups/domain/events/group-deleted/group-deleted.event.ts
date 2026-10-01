import { IGroupEventData } from '@contexts/groups/domain/events/interfaces/group-event-data.interface';
import { BaseEvent } from '@sisques-labs/nestjs-kit';

export class GroupDeletedEvent extends BaseEvent<IGroupEventData> {}
