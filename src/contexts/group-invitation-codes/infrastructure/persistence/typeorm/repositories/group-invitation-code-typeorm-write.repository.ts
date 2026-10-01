import { GroupInvitationCodeAggregate } from '@contexts/group-invitation-codes/domain/aggregates/group-invitation-code.aggregate';
import { ActiveInvitationCodeConflictException } from '@contexts/group-invitation-codes/domain/exceptions/active-invitation-code-conflict.exception';
import { InvitationCodeCollisionException } from '@contexts/group-invitation-codes/domain/exceptions/invitation-code-collision.exception';
import { IGroupInvitationCodeWriteRepository } from '@contexts/group-invitation-codes/domain/repositories/write/group-invitation-code-write.repository';
import { GroupInvitationCodeEntity } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/entities/group-invitation-code.entity';
import { GroupInvitationCodeTypeormMapper } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/mappers/group-invitation-code-typeorm.mapper';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { applyCriteriaToQueryBuilder } from '@sisques-labs/nestjs-kit/typeorm';
import { DataSource, IsNull, QueryFailedError } from 'typeorm';

/** Columns a caller may filter or sort by. */
const CRITERIA_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'groupId',
  'code',
  'createdBy',
  'revokedAt',
  'createdAt',
  'updatedAt',
]);

const UNIQUE_VIOLATION = '23505';
const CODE_CONSTRAINT = 'uq_group_invitation_codes_code';

@Injectable()
export class GroupInvitationCodeTypeormWriteRepository
  extends BaseDatabaseRepository
  implements IGroupInvitationCodeWriteRepository
{
  private readonly repoLogger = new Logger(
    GroupInvitationCodeTypeormWriteRepository.name,
  );

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: GroupInvitationCodeTypeormMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<GroupInvitationCodeAggregate | null> {
    const row = await this.dataSource
      .getRepository(GroupInvitationCodeEntity)
      .findOneBy({ id });
    return row ? this.mapper.toAggregate(row) : null;
  }

  async findActiveByGroupId(
    groupId: string,
  ): Promise<GroupInvitationCodeAggregate | null> {
    const row = await this.dataSource
      .getRepository(GroupInvitationCodeEntity)
      .findOneBy({ groupId, revokedAt: IsNull() });
    return row ? this.mapper.toAggregate(row) : null;
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<GroupInvitationCodeAggregate>> {
    const fields = [...criteria.filters, ...criteria.sorts].map((c) => c.field);
    const unknown = fields.find((field) => !CRITERIA_FIELDS.has(field));
    if (unknown) {
      throw new Error(
        `Field "${unknown}" is not queryable on invitation codes`,
      );
    }

    const { page, limit, skip } = await this.calculatePagination(criteria);
    const qb = this.dataSource
      .getRepository(GroupInvitationCodeEntity)
      .createQueryBuilder('code');
    applyCriteriaToQueryBuilder(qb, criteria, {
      alias: 'code',
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

  async save(
    aggregate: GroupInvitationCodeAggregate,
  ): Promise<GroupInvitationCodeAggregate> {
    const entity = this.mapper.toEntity(aggregate);
    try {
      await this.dataSource
        .getRepository(GroupInvitationCodeEntity)
        .save(entity);
    } catch (error) {
      throw this.translate(error, entity.groupId);
    }
    this.repoLogger.log(`Saved invitation code ${entity.id}`);
    return aggregate;
  }

  async replaceActive(
    revoked: GroupInvitationCodeAggregate | null,
    created: GroupInvitationCodeAggregate,
  ): Promise<void> {
    const entity = this.mapper.toEntity(created);
    try {
      await this.dataSource.transaction(async (manager) => {
        if (revoked) {
          const { id, revokedAt, updatedAt } = this.mapper.toEntity(revoked);
          // Only a still-active row can be revoked: losing the race means
          // another request already replaced it.
          const result = await manager.update(
            GroupInvitationCodeEntity,
            { id, revokedAt: IsNull() },
            { revokedAt, updatedAt },
          );
          if (!result.affected) {
            throw new ActiveInvitationCodeConflictException(entity.groupId);
          }
        }
        await manager.insert(GroupInvitationCodeEntity, entity);
      });
    } catch (error) {
      throw this.translate(error, entity.groupId);
    }
    this.repoLogger.log(`Replaced active invitation code of ${entity.groupId}`);
  }

  async delete(id: string): Promise<void> {
    await this.dataSource
      .getRepository(GroupInvitationCodeEntity)
      .delete({ id });
  }

  /** Maps unique-constraint violations to domain errors; others pass through. */
  private translate(error: unknown, groupId: string): unknown {
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === UNIQUE_VIOLATION
    ) {
      const { constraint } = error.driverError as { constraint?: string };
      return constraint === CODE_CONSTRAINT
        ? new InvitationCodeCollisionException()
        : new ActiveInvitationCodeConflictException(groupId);
    }
    return error;
  }
}
