import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';

export const GROUP_READ_REPOSITORY = Symbol('GROUP_READ_REPOSITORY');

// TODO: Review if this needs to extend IBaseReadRepository

/**
 * Query-only view over the `groups` table. It deliberately does not extend
 * `IBaseReadRepository`: there is no separate projection store, so the base
 * `save` / `delete` / `findByCriteria` would have no meaning here.
 */
export interface GroupReadRepository {
  findById(id: string): Promise<GroupViewModel | null>;
  findByIds(ids: string[]): Promise<GroupViewModel[]>;
}
