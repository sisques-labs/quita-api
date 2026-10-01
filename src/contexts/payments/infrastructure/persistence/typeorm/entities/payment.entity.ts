import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Constraints (amount > 0, payer differs from payee) and the
 * `(group_id, deleted_at)` index live in the migration. `group_id` has no
 * foreign key: groups belong to another context.
 */
@Entity('payments')
export class PaymentEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  /** Identity-provider subject of the member who paid. */
  @Column({ name: 'from_user_id', type: 'varchar', length: 64 })
  fromUserId!: string;

  /** Identity-provider subject of the member who received the money. */
  @Column({ name: 'to_user_id', type: 'varchar', length: 64 })
  toUserId!: string;

  @Column({ name: 'amount_cents', type: 'integer' })
  amountCents!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  /** Postgres `date`, read back as a date-only `YYYY-MM-DD` string. */
  @Column({ name: 'paid_on', type: 'date' })
  paidOn!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  note!: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 64 })
  createdBy!: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 64 })
  updatedBy!: string;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
