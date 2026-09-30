import { GroupMembershipReadRepository } from '@contexts/group-members/domain/repositories/read/group-membership-read.repository';
import { GroupMembershipViewModel } from '@contexts/group-members/domain/view-models/group-membership.view-model';
import { GroupMemberEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-member.entity';
import { GroupMembershipEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-membership.entity';
import { GroupMembershipTypeormMapper } from '@contexts/group-members/infrastructure/persistence/typeorm/mappers/group-membership-typeorm.mapper';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class GroupMembershipTypeormReadRepository implements GroupMembershipReadRepository {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: GroupMembershipTypeormMapper,
  ) {}

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
}
