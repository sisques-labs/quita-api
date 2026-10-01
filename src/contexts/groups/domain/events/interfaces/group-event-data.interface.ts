import { GroupPrimitives } from '@contexts/groups/domain/primitives/group.primitives';
import { IBaseEventData } from '@sisques-labs/nestjs-kit';

export type IGroupEventData = GroupPrimitives & IBaseEventData;
