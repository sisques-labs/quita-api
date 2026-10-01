import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('group_memberships')
export class GroupMembershipEntity {
  @PrimaryColumn({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @Column({ type: 'integer', default: 2 })
  capacity!: number;

  /** Optimistic lock token, compared and bumped by the write repository. */
  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
