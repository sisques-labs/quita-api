import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { IBaseReadRepository } from '@sisques-labs/nestjs-kit';

export const GROUP_READ_REPOSITORY = Symbol('GROUP_READ_REPOSITORY');

/**
 * Query view over the `groups` table. There is no separate projection store,
 * so `save` / `delete` are no-ops (the write side persists). `findByCriteria`
 * is persistence-only: it filters and sorts by the view-model scalar columns
 * and is not exposed through GraphQL.
 */
export interface IGroupReadRepository extends IBaseReadRepository<GroupViewModel> {
  findByIds(ids: string[]): Promise<GroupViewModel[]>;
}
