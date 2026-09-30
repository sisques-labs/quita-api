import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('group_members')
@Unique('uq_group_members_group_id_user_id', ['groupId', 'userId'])
export class GroupMemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 16 })
  role!: string;

  @Column({ name: 'joined_at', type: 'timestamptz' })
  joinedAt!: Date;
}
