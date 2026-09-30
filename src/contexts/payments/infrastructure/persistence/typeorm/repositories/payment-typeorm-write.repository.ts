import { PaymentAggregate } from '@contexts/payments/domain/aggregates/payment.aggregate';
import { PaymentWriteRepository } from '@contexts/payments/domain/repositories/write/payment-write.repository';
import { PaymentEntity } from '@contexts/payments/infrastructure/persistence/typeorm/entities/payment.entity';
import { PaymentTypeormMapper } from '@contexts/payments/infrastructure/persistence/typeorm/mappers/payment-typeorm.mapper';
import {
  applyPaymentCriteria,
  assertQueryableFields,
  PAYMENT_ALIAS,
} from '@contexts/payments/infrastructure/persistence/typeorm/repositories/payment-criteria-query';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { DataSource } from 'typeorm';

@Injectable()
export class PaymentTypeormWriteRepository
  extends BaseDatabaseRepository
  implements PaymentWriteRepository
{
  private readonly repoLogger = new Logger(PaymentTypeormWriteRepository.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: PaymentTypeormMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<PaymentAggregate | null> {
    const row = await this.dataSource
      .getRepository(PaymentEntity)
      .findOneBy({ id });
    return row ? this.mapper.toAggregate(row) : null;
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<PaymentAggregate>> {
    assertQueryableFields(criteria);

    const { page, limit, skip } = await this.calculatePagination(criteria);
    const qb = this.dataSource
      .getRepository(PaymentEntity)
      .createQueryBuilder(PAYMENT_ALIAS);
    applyPaymentCriteria(qb, criteria, {
      field: 'createdAt',
      direction: SortDirection.DESC,
    });
    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResult(
      rows.map((row) => this.mapper.toAggregate(row)),
      total,
      page,
      limit,
    );
  }

  async save(aggregate: PaymentAggregate): Promise<PaymentAggregate> {
    const saved = await this.dataSource
      .getRepository(PaymentEntity)
      .save(this.mapper.toEntity(aggregate));
    this.repoLogger.log(`Saved payment ${saved.id}`);
    return this.mapper.toAggregate(saved);
  }

  /** Hard delete, for compensation only: members soft-delete via the aggregate. */
  async delete(id: string): Promise<void> {
    await this.dataSource.getRepository(PaymentEntity).delete({ id });
  }
}
