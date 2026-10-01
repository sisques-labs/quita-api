import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

export const GROUP_WRITE_REPOSITORY = Symbol('GROUP_WRITE_REPOSITORY');

export type IGroupWriteRepository = IBaseWriteRepository<GroupAggregate>;
