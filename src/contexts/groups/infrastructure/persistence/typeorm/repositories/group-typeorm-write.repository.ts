import { GroupAggregate } from '@contexts/groups/domain/aggregates/group.aggregate';
import { GroupWriteRepository } from '@contexts/groups/domain/repositories/write/group-write.repository';
import { GroupEntity } from '@contexts/groups/infrastructure/persistence/typeorm/entities/group.entity';
import { GroupTypeormMapper } from '@contexts/groups/infrastructure/persistence/typeorm/mappers/group-typeorm.mapper';
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

/** Columns a caller may filter or sort by. */
const CRITERIA_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'name',
  'createdBy',
  'createdAt',
  'updatedAt',
]);

@Injectable()
export class GroupTypeormWriteRepository
  extends BaseDatabaseRepository
  implements GroupWriteRepository
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
    const fields = [...criteria.filters, ...criteria.sorts].map((c) => c.field);
    const unknown = fields.find((field) => !CRITERIA_FIELDS.has(field));
    if (unknown) {
      throw new Error(`Field "${unknown}" is not queryable on groups`);
    }

    const { page, limit, skip } = await this.calculatePagination(criteria);
    const qb = this.dataSource
      .getRepository(GroupEntity)
      .createQueryBuilder('group');
    applyCriteriaToQueryBuilder(qb, criteria, {
      alias: 'group',
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
