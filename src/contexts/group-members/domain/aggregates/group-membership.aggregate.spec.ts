import { GroupMembershipAggregate } from '@contexts/group-members/domain/aggregates/group-membership.aggregate';
import { GroupMembershipBuilder } from '@contexts/group-members/domain/builders/group-membership.builder';
import { GroupMember } from '@contexts/group-members/domain/entities/group-member';
import { GroupMemberRole } from '@contexts/group-members/domain/enums/group-member-role.enum';
import { GroupMemberAddedEvent } from '@contexts/group-members/domain/events/group-member-added/group-member-added.event';
import { GroupMembershipCreatedEvent } from '@contexts/group-members/domain/events/group-membership-created/group-membership-created.event';
import { GroupMemberAlreadyExistsException } from '@contexts/group-members/domain/exceptions/group-member-already-exists.exception';
import { GroupMembershipFullException } from '@contexts/group-members/domain/exceptions/group-membership-full.exception';

const GROUP_ID = '0b6f6b0e-6f0e-4d8a-9d0a-7d6f2f3a1c11';

const member = (userId: string, role = GroupMemberRole.MEMBER): GroupMember =>
  GroupMember.fromPrimitives({
    userId,
    role,
    joinedAt: new Date('2026-01-01T10:00:00Z'),
  });

const buildMembership = (capacity?: number): GroupMembershipAggregate => {
  const builder = new GroupMembershipBuilder().withId(GROUP_ID).withMembers([
    {
      userId: 'owner',
      role: GroupMemberRole.OWNER,
      joinedAt: new Date('2026-01-01T09:00:00Z'),
    },
  ]);
  return (
    capacity === undefined ? builder : builder.withCapacity(capacity)
  ).build();
};

describe('GroupMembershipAggregate', () => {
  it('defaults to a capacity of 2 and an unpersisted version', () => {
    const primitives = buildMembership().toPrimitives();

    expect(primitives.capacity).toBe(2);
    expect(primitives.version).toBe(0);
    expect(primitives.id).toBe(GROUP_ID);
    expect(primitives.members).toEqual([
      {
        userId: 'owner',
        role: GroupMemberRole.OWNER,
        joinedAt: new Date('2026-01-01T09:00:00Z'),
      },
    ]);
  });

  describe('create', () => {
    it('emits GroupMembershipCreatedEvent carrying the roster', () => {
      const aggregate = buildMembership();

      aggregate.create();

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(GroupMembershipCreatedEvent);
      expect(events[0]).toMatchObject({
        aggregateRootId: GROUP_ID,
        aggregateRootType: 'GroupMembershipAggregate',
      });
    });
  });

  describe('addMember', () => {
    it('adds a member while there is room and emits GroupMemberAddedEvent', () => {
      const aggregate = buildMembership();

      aggregate.addMember(member('guest'));

      expect(aggregate.toPrimitives().members.map((m) => m.userId)).toEqual([
        'owner',
        'guest',
      ]);
      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(GroupMemberAddedEvent);
    });

    it('rejects a third member and leaves the roster unchanged', () => {
      const aggregate = buildMembership();
      aggregate.addMember(member('guest'));

      expect(() => aggregate.addMember(member('third'))).toThrow(
        GroupMembershipFullException,
      );

      expect(aggregate.toPrimitives().members).toHaveLength(2);
    });

    it('honours a larger capacity set as data', () => {
      const aggregate = buildMembership(3);

      aggregate.addMember(member('guest'));
      aggregate.addMember(member('third'));

      expect(aggregate.toPrimitives().members).toHaveLength(3);
      expect(() => aggregate.addMember(member('fourth'))).toThrow(
        GroupMembershipFullException,
      );
    });

    it('rejects a duplicate user even when the group is full', () => {
      const aggregate = buildMembership();
      aggregate.addMember(member('guest'));

      expect(() => aggregate.addMember(member('guest'))).toThrow(
        GroupMemberAlreadyExistsException,
      );
      expect(aggregate.toPrimitives().members).toHaveLength(2);
    });
  });

  describe('isMember', () => {
    it('answers true only for users on the roster', () => {
      const aggregate = buildMembership();

      expect(aggregate.isMember('owner')).toBe(true);
      expect(aggregate.isMember('stranger')).toBe(false);
    });
  });

  it('exposes the persisted version through its accessor', () => {
    const aggregate = new GroupMembershipBuilder()
      .withId(GROUP_ID)
      .withVersion(4)
      .withMembers([
        {
          userId: 'owner',
          role: GroupMemberRole.OWNER,
          joinedAt: new Date('2026-01-01T09:00:00Z'),
        },
      ])
      .build();

    expect(aggregate.version.value).toBe(4);
    expect(buildMembership().version.value).toBe(0);
  });
});
