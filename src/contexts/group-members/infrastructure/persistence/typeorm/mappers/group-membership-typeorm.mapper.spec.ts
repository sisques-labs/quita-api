import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMemberEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-member.entity';
import { GroupMembershipEntity } from '@contexts/group-members/infrastructure/persistence/typeorm/entities/group-membership.entity';
import { GroupMembershipTypeormMapper } from '@contexts/group-members/infrastructure/persistence/typeorm/mappers/group-membership-typeorm.mapper';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';
const CREATED = new Date('2026-01-01T09:00:00Z');
const UPDATED = new Date('2026-01-02T09:00:00Z');

const membership = Object.assign(new GroupMembershipEntity(), {
  groupId: GROUP_ID,
  capacity: 3,
  version: 4,
  createdAt: CREATED,
  updatedAt: UPDATED,
});
const members = [
  Object.assign(new GroupMemberEntity(), {
    id: 'm1',
    groupId: GROUP_ID,
    userId: 'owner',
    role: GroupMemberRole.OWNER,
    joinedAt: CREATED,
  }),
  Object.assign(new GroupMemberEntity(), {
    id: 'm2',
    groupId: GROUP_ID,
    userId: 'guest',
    role: GroupMemberRole.MEMBER,
    joinedAt: UPDATED,
  }),
];

describe('GroupMembershipTypeormMapper', () => {
  const mapper = new GroupMembershipTypeormMapper(new GroupMembershipBuilder());

  it('hydrates the aggregate from the roster rows, version included', () => {
    const primitives = mapper.toAggregate(membership, members).toPrimitives();

    expect(primitives).toEqual({
      id: GROUP_ID,
      capacity: 3,
      version: 4,
      createdAt: CREATED,
      updatedAt: UPDATED,
      members: [
        { userId: 'owner', role: GroupMemberRole.OWNER, joinedAt: CREATED },
        { userId: 'guest', role: GroupMemberRole.MEMBER, joinedAt: UPDATED },
      ],
    });
  });

  it('projects the same rows to a view model', () => {
    const viewModel = mapper.toViewModel(membership, members);

    expect(viewModel.id).toBe(GROUP_ID);
    expect(viewModel.capacity).toBe(3);
    expect(viewModel.members.map((m) => m.userId)).toEqual(['owner', 'guest']);
  });
});
