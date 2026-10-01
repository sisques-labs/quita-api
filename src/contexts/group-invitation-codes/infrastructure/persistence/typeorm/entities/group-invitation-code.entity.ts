import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Uniqueness lives in the migration: UNIQUE(code) and the partial unique index
 * on (group_id) WHERE revoked_at IS NULL.
 */
@Entity('group_invitation_codes')
export class GroupInvitationCodeEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @Column({ type: 'varchar', length: 8 })
  code!: string;

  /** Identity-provider subject of the member who generated the code. */
  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
