import { IGroupInvitationCodeReadRepository } from '@contexts/group-invitation-codes/domain/repositories/read/group-invitation-code-read.repository';
import { GroupInvitationCodeViewModel } from '@contexts/group-invitation-codes/domain/view-models/group-invitation-code.view-model';
import { GroupInvitationCodeEntity } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/entities/group-invitation-code.entity';
import { GroupInvitationCodeTypeormMapper } from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/mappers/group-invitation-code-typeorm.mapper';
import {
  assertQueryableFields,
  GROUP_INVITATION_CODE_ALIAS,
} from '@contexts/group-invitation-codes/infrastructure/persistence/typeorm/repositories/group-invitation-code-queryable-fields';
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
export class GroupInvitationCodeTypeormReadRepository
  extends BaseDatabaseRepository
  implements IGroupInvitationCodeReadRepository
{
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: GroupInvitationCodeTypeormMapper,
  ) {
    super();
  }

  async findById(id: string): Promise<GroupInvitationCodeViewModel | null> {
    const row = await this.dataSource
      .getRepository(GroupInvitationCodeEntity)
      .findOneBy({ id });
    return row ? this.mapper.toViewModel(row) : null;
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<GroupInvitationCodeViewModel>> {
    assertQueryableFields(criteria);

    const { page, limit, skip } = await this.calculatePagination(criteria);
    const qb = this.dataSource
      .getRepository(GroupInvitationCodeEntity)
      .createQueryBuilder(GROUP_INVITATION_CODE_ALIAS);
    applyCriteriaToQueryBuilder(qb, criteria, {
      alias: GROUP_INVITATION_CODE_ALIAS,
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

  async findActiveByCode(
    code: string,
  ): Promise<GroupInvitationCodeViewModel | null> {
    const row = await this.dataSource
      .getRepository(GroupInvitationCodeEntity)
      .findOneBy({ code, revokedAt: IsNull() });
    return row ? this.mapper.toViewModel(row) : null;
  }

  async save(_viewModel: GroupInvitationCodeViewModel): Promise<void> {
    // read-side projection — write side handles persistence
  }

  async delete(_id: string): Promise<void> {
    // read-side projection — write side handles persistence
  }
}
