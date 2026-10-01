import { ExpenseCategory } from '@contexts/expenses/domain/enums/expense-category.enum';
import { ExpenseSplitType } from '@contexts/expenses/domain/enums/expense-split-type.enum';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Constraints (amount > 0, category values) and the `(group_id, deleted_at)`
 * index live in the migration. `group_id` has no foreign key: groups belong to
 * another context.
 */
@Entity('expenses')
export class ExpenseEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @Column({ name: 'amount_cents', type: 'integer' })
  amountCents!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  /** Identity-provider subject of the member who paid. */
  @Column({ name: 'paid_by', type: 'varchar', length: 64 })
  paidBy!: string;

  /** Postgres `date`, read back as a date-only `YYYY-MM-DD` string. */
  @Column({ name: 'spent_on', type: 'date' })
  spentOn!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  category!: ExpenseCategory | null;

  @Column({ name: 'split_type', type: 'varchar', length: 16 })
  splitType!: ExpenseSplitType;

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
