import { IGroupReadRepository } from '@contexts/groups/domain/repositories/read/group-read.repository';
import { GroupViewModel } from '@contexts/groups/domain/view-models/group.view-model';
import { GroupEntity } from '@contexts/groups/infrastructure/persistence/typeorm/entities/group.entity';
import { GroupTypeormMapper } from '@contexts/groups/infrastructure/persistence/typeorm/mappers/group-typeorm.mapper';
import {
  assertQueryableFields,
  GROUP_ALIAS,
} from '@contexts/groups/infrastructure/persistence/typeorm/repositories/group-queryable-fields';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { applyCriteriaToQueryBuilder } from '@sisques-labs/nestjs-kit/typeorm';
import { DataSource, In } from 'typeorm';

@Injectable()
export class GroupTypeormReadRepository
  extends BaseDatabaseRepository
  implements IGroupReadRepository
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: GroupTypeormMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<GroupViewModel | null> {
    const row = await this.dataSource
      .getRepository(GroupEntity)
      .findOneBy({ id });
    return row ? this.mapper.toViewModel(row) : null;
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<GroupViewModel>> {
    assertQueryableFields(criteria);

    const { page, limit, skip } = await this.calculatePagination(criteria);
    const qb = this.dataSource
      .getRepository(GroupEntity)
      .createQueryBuilder(GROUP_ALIAS);
    applyCriteriaToQueryBuilder(qb, criteria, {
      alias: GROUP_ALIAS,
      defaultSort: { field: 'createdAt', direction: SortDirection.ASC },
    });
    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResult(
      rows.map((row) => this.mapper.toViewModel(row)),
      total,
      page,
      limit,
    );
  }

  async findByIds(ids: string[]): Promise<GroupViewModel[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.dataSource.getRepository(GroupEntity).find({
      where: { id: In(ids) },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => this.mapper.toViewModel(row));
  }

  async save(_viewModel: GroupViewModel): Promise<void> {
    // read-side projection — write side handles persistence
  }

  async delete(_id: string): Promise<void> {
    // read-side projection — write side handles persistence
  }
}
