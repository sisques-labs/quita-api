import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('groups')
export class GroupEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  /** Identity-provider subject of the creator (opaque string, max 64). */
  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
