import { IGroupMembershipReadRepository } from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { GroupMemberEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-member.entity';
import { GroupMembershipEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-membership.entity';
import { GroupMembershipTypeormMapper } from '@contexts/group-members/infrastructure/persistence/typeorm/mappers/group-membership-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Criteria, PaginatedResult } from '@sisques-labs/nestjs-kit';
import { DataSource } from 'typeorm';

@Injectable()
export class GroupMembershipTypeormReadRepository implements IGroupMembershipReadRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: GroupMembershipTypeormMapper,
  ) {}

  /** A roster is addressed by its group id, so `id` is the group id. */
  async findById(id: string): Promise<GroupMembershipViewModel | null> {
    return this.findByGroupId(id);
  }

  /**
   * Not supported: a roster is addressed by group id (`findById` /
   * `findByGroupId`), never searched by criteria.
   */
  async findByCriteria(
    _criteria: Criteria,
  ): Promise<PaginatedResult<GroupMembershipViewModel>> {
    throw new Error(
      'Group rosters are addressed by group id and cannot be searched by criteria',
    );
  }

  async findByGroupId(
    groupId: string,
  ): Promise<GroupMembershipViewModel | null> {
    const membership = await this.dataSource
      .getRepository(GroupMembershipEntity)
      .findOneBy({ groupId });
    if (!membership) {
      return null;
    }
    const members = await this.dataSource
      .getRepository(GroupMemberEntity)
      .find({ where: { groupId }, order: { joinedAt: 'ASC', id: 'ASC' } });
    return this.mapper.toViewModel(membership, members);
  }

  async isMember(groupId: string, userId: string): Promise<boolean> {
    return this.dataSource
      .getRepository(GroupMemberEntity)
      .existsBy({ groupId, userId });
  }

  async findGroupIdsByUserId(userId: string): Promise<string[]> {
    const rows = await this.dataSource.getRepository(GroupMemberEntity).find({
      where: { userId },
      select: { groupId: true },
      order: { joinedAt: 'ASC', id: 'ASC' },
    });
    return rows.map((row) => row.groupId);
  }

  async save(_viewModel: GroupMembershipViewModel): Promise<void> {
    // read-side projection — write side handles persistence
  }

  async delete(_id: string): Promise<void> {
    // read-side projection — write side handles persistence
  }
}
