import { ExpenseReadRepository } from '@contexts/expenses/domain/repositories/read/expense-read.repository';
import { ExpenseViewModel } from '@contexts/expenses/domain/view-models/expense.view-model';
import { ExpenseEntity } from '@contexts/expenses/infrastructure/persistence/typeorm/entities/expense.entity';
import { ExpenseTypeormMapper } from '@contexts/expenses/infrastructure/persistence/typeorm/mappers/expense-typeorm.mapper';
import {
  assertQueryableFields,
  EXPENSE_ALIAS,
} from '@contexts/expenses/infrastructure/persistence/typeorm/repositories/expense-queryable-fields';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { applyCriteriaToQueryBuilder } from '@sisques-labs/nestjs-kit/typeorm';
import { DataSource, IsNull } from 'typeorm';

@Injectable()
export class ExpenseTypeormReadRepository
  extends BaseDatabaseRepository
  implements ExpenseReadRepository
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: ExpenseTypeormMapper,
  ) {
    super();
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<ExpenseViewModel>> {
    assertQueryableFields(criteria);

    const { page, limit, skip } = await this.calculatePagination(criteria);
    const qb = this.dataSource
      .getRepository(ExpenseEntity)
      .createQueryBuilder(EXPENSE_ALIAS);
    applyCriteriaToQueryBuilder(qb, criteria, {
      alias: EXPENSE_ALIAS,
      defaultSort: [
        { field: 'spentOn', direction: SortDirection.DESC },
        { field: 'createdAt', direction: SortDirection.DESC },
      ],
    });
    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResult(
      rows.map((row) => this.mapper.toViewModel(row)),
      total,
      page,
      limit,
    );
  }

  async findActiveByGroupId(groupId: string): Promise<ExpenseViewModel[]> {
    const rows = await this.dataSource
      .getRepository(ExpenseEntity)
      .find({ where: { groupId, deletedAt: IsNull() } });
    return rows.map((row) => this.mapper.toViewModel(row));
  }
}
