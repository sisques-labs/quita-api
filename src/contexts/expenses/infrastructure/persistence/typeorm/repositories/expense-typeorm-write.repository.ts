import { ExpenseAggregate } from '@contexts/expenses/domain/aggregates/expense.aggregate';
import { ExpenseWriteRepository } from '@contexts/expenses/domain/repositories/write/expense-write.repository';
import { ExpenseEntity } from '@contexts/expenses/infrastructure/persistence/typeorm/entities/expense.entity';
import { ExpenseTypeormMapper } from '@contexts/expenses/infrastructure/persistence/typeorm/mappers/expense-typeorm.mapper';
import {
  assertQueryableFields,
  EXPENSE_ALIAS,
} from '@contexts/expenses/infrastructure/persistence/typeorm/repositories/expense-queryable-fields';
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
export class ExpenseTypeormWriteRepository
  extends BaseDatabaseRepository
  implements ExpenseWriteRepository
{
  private readonly repoLogger = new Logger(ExpenseTypeormWriteRepository.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: ExpenseTypeormMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<ExpenseAggregate | null> {
    const row = await this.dataSource
      .getRepository(ExpenseEntity)
      .findOneBy({ id });
    return row ? this.mapper.toAggregate(row) : null;
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<ExpenseAggregate>> {
    assertQueryableFields(criteria);

    const { page, limit, skip } = await this.calculatePagination(criteria);
    const qb = this.dataSource
      .getRepository(ExpenseEntity)
      .createQueryBuilder(EXPENSE_ALIAS);
    applyCriteriaToQueryBuilder(qb, criteria, {
      alias: EXPENSE_ALIAS,
      defaultSort: {
        field: 'createdAt',
        direction: SortDirection.DESC,
      },
    });
    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResult(
      rows.map((row) => this.mapper.toAggregate(row)),
      total,
      page,
      limit,
    );
  }

  async save(aggregate: ExpenseAggregate): Promise<ExpenseAggregate> {
    const saved = await this.dataSource
      .getRepository(ExpenseEntity)
      .save(this.mapper.toEntity(aggregate));
    this.repoLogger.log(`Saved expense ${saved.id}`);
    return this.mapper.toAggregate(saved);
  }

  /** Hard delete, for compensation only: members soft-delete via the aggregate. */
  async delete(id: string): Promise<void> {
    await this.dataSource.getRepository(ExpenseEntity).delete({ id });
  }
}
