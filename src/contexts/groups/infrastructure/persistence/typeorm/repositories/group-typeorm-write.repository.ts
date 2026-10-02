import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { IGroupWriteRepository } from '@contexts/groups/domain/repositories/write/group-write.repository';
import { GroupEntity } from '@contexts/groups/infrastructure/persistence/typeorm/entities/group.entity';
import { GroupTypeormMapper } from '@contexts/groups/infrastructure/persistence/typeorm/mappers/group-typeorm.mapper';
import {
  assertQueryableFields,
  GROUP_ALIAS,
} from '@contexts/groups/infrastructure/persistence/typeorm/repositories/group-queryable-fields';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { applyCriteriaToQueryBuilder } from '@sisques-labs/nestjs-kit/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class GroupTypeormWriteRepository
  extends BaseDatabaseRepository
  implements IGroupWriteRepository
{
  private readonly repoLogger = new Logger(GroupTypeormWriteRepository.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: GroupTypeormMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<GroupAggregate | null> {
    const row = await this.dataSource
      .getRepository(GroupEntity)
      .findOneBy({ id });
    return row ? this.mapper.toAggregate(row) : null;
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<GroupAggregate>> {
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
      rows.map((row) => this.mapper.toAggregate(row)),
      total,
      page,
      limit,
    );
  }

  async save(aggregate: GroupAggregate): Promise<GroupAggregate> {
    const saved = await this.dataSource
      .getRepository(GroupEntity)
      .save(this.mapper.toEntity(aggregate));
    this.repoLogger.log(`Saved group ${saved.id}`);
    return this.mapper.toAggregate(saved);
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.getRepository(GroupEntity).delete({ id });
  }
}
