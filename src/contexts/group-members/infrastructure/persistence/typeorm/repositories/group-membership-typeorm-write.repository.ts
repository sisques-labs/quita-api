import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';
import { GroupMembershipConcurrencyException } from '@contexts/group-members/domain/exceptions/group-membership-concurrency.exception';
import { GroupMembershipWriteRepository } from '@contexts/group-members/domain/repositories/write/group-membership-write.repository';
import { GroupMemberEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-member.entity';
import { GroupMembershipEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-membership.entity';
import { GroupMembershipTypeormMapper } from '@contexts/group-members/infrastructure/persistence/typeorm/mappers/group-membership-typeorm.mapper';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
  SortDirection,
} from '@sisques-labs/nestjs-kit';
import { applyCriteriaToQueryBuilder } from '@sisques-labs/nestjs-kit/typeorm';
import { DataSource, EntityManager } from 'typeorm';

/** Roster columns a caller may filter or sort by. */
const CRITERIA_FIELDS: ReadonlySet<string> = new Set([
  'groupId',
  'capacity',
  'version',
  'createdAt',
  'updatedAt',
]);

@Injectable()
export class GroupMembershipTypeormWriteRepository
  extends BaseDatabaseRepository
  implements GroupMembershipWriteRepository
{
  private readonly repoLogger = new Logger(
    GroupMembershipTypeormWriteRepository.name,
  );

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly mapper: GroupMembershipTypeormMapper,
  ) {
    super();
  }

  async findById(groupId: string): Promise<GroupMembershipAggregate | null> {
    const membership = await this.dataSource
      .getRepository(GroupMembershipEntity)
      .findOneBy({ groupId });
    if (!membership) {
      return null;
    }
    const members = await this.loadMembers([groupId]);
    return this.mapper.toAggregate(membership, members.get(groupId) ?? []);
  }

  async findByCriteria(
    criteria: Criteria,
  ): Promise<PaginatedResult<GroupMembershipAggregate>> {
    const fields = [...criteria.filters, ...criteria.sorts].map((c) => c.field);
    const unknown = fields.find((field) => !CRITERIA_FIELDS.has(field));
    if (unknown) {
      throw new Error(`Field "${unknown}" is not queryable on group rosters`);
    }

    const { page, limit, skip } = await this.calculatePagination(criteria);
    const qb = this.dataSource
      .getRepository(GroupMembershipEntity)
      .createQueryBuilder('membership');
    applyCriteriaToQueryBuilder(qb, criteria, {
      alias: 'membership',
      defaultSort: { field: 'createdAt', direction: SortDirection.ASC },
    });
    const [rows, total] = await qb.skip(skip).take(limit).getManyAndCount();

    const members = await this.loadMembers(rows.map((row) => row.groupId));
    const items = rows.map((row) =>
      this.mapper.toAggregate(row, members.get(row.groupId) ?? []),
    );
    return new PaginatedResult(items, total, page, limit);
  }

  async save(
    aggregate: GroupMembershipAggregate,
  ): Promise<GroupMembershipAggregate> {
    const primitives = aggregate.toPrimitives();

    await this.dataSource.transaction(async (manager) => {
      await this.writeMembership(manager, primitives);
      await this.insertNewMembers(manager, primitives);
    });

    this.repoLogger.log(`Saved roster of group ${primitives.id}`);
    return (await this.findById(primitives.id))!;
  }

  async delete(groupId: string): Promise<void> {
    await this.dataSource
      .getRepository(GroupMembershipEntity)
      .delete({ groupId });
  }

  /** Version 0 is a new roster; otherwise compare-and-bump the version. */
  private async writeMembership(
    manager: EntityManager,
    primitives: ReturnType<GroupMembershipAggregate['toPrimitives']>,
  ): Promise<void> {
    const { id: groupId, capacity, version, createdAt, updatedAt } = primitives;

    if (version === 0) {
      await manager.insert(GroupMembershipEntity, {
        groupId,
        capacity,
        version: 1,
        createdAt,
        updatedAt,
      });
      return;
    }

    const result = await manager.update(
      GroupMembershipEntity,
      { groupId, version },
      { capacity, updatedAt, version: () => 'version + 1' },
    );
    if (!result.affected) {
      throw new GroupMembershipConcurrencyException(groupId);
    }
  }

  private async insertNewMembers(
    manager: EntityManager,
    primitives: ReturnType<GroupMembershipAggregate['toPrimitives']>,
  ): Promise<void> {
    const stored = await manager.find(GroupMemberEntity, {
      where: { groupId: primitives.id },
      select: { userId: true },
    });
    const storedIds = new Set(stored.map((row) => row.userId));

    const fresh = primitives.members
      .filter((member) => !storedIds.has(member.userId))
      .map((member) => ({ ...member, groupId: primitives.id }));
    if (fresh.length > 0) {
      await manager.insert(GroupMemberEntity, fresh);
    }
  }

  private async loadMembers(
    groupIds: string[],
  ): Promise<Map<string, GroupMemberEntity[]>> {
    const byGroup = new Map<string, GroupMemberEntity[]>();
    if (groupIds.length === 0) {
      return byGroup;
    }
    const rows = await this.dataSource
      .getRepository(GroupMemberEntity)
      .createQueryBuilder('member')
      .where('member.groupId IN (:...groupIds)', { groupIds })
      .orderBy('member.joinedAt', 'ASC')
      .addOrderBy('member.id', 'ASC')
      .getMany();
    for (const row of rows) {
      byGroup.set(row.groupId, [...(byGroup.get(row.groupId) ?? []), row]);
    }
    return byGroup;
  }
}
