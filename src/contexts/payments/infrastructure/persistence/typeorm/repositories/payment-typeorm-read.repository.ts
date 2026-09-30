import { PaymentReadRepository } from '@contexts/payments/domain/repositories/read/payment-read.repository';
import { PaymentViewModel } from '@contexts/payments/domain/view-models/payment.view-model';
import { PaymentEntity } from '@contexts/payments/infrastructure/persistence/typeorm/entities/payment.entity';
import { PaymentTypeormMapper } from '@contexts/payments/infrastructure/persistence/typeorm/mappers/payment-typeorm.mapper';
import {
  applyPaymentCriteria,
  assertQueryableFields,
  PAYMENT_ALIAS,
} from '@contexts/payments/infrastructure/persistence/typeorm/repositories/payment-criteria-query';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { DataSource, IsNull } from 'typeorm';

@Injectable()
export class PaymentTypeormReadRepository
  extends BaseDatabaseRepository
  implements PaymentReadRepository
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: PaymentTypeormMapper,
  ) {
    super();
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<PaymentViewModel>> {
    assertQueryableFields(criteria);

    const { page, limit, skip } = await this.calculatePagination(criteria);
    const qb = this.dataSource
      .getRepository(PaymentEntity)
      .createQueryBuilder(PAYMENT_ALIAS);
    applyPaymentCriteria(qb, criteria, [
      { field: 'paidOn', direction: SortDirection.DESC },
      { field: 'createdAt', direction: SortDirection.DESC },
    ]);
    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResult(
      rows.map((row) => this.mapper.toViewModel(row)),
      total,
      page,
      limit,
    );
  }

  async findActiveByGroupId(groupId: string): Promise<PaymentViewModel[]> {
    const rows = await this.dataSource
      .getRepository(PaymentEntity)
      .find({ where: { groupId, deletedAt: IsNull() } });
    return rows.map((row) => this.mapper.toViewModel(row));
  }
}
