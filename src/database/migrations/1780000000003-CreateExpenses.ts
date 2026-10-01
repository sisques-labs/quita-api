import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpenses1780000000003 implements MigrationInterface {
  name = 'CreateExpenses1780000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // No foreign key to `groups`: that table belongs to another context.
    await queryRunner.query(`
      CREATE TABLE "expenses" (
        "id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        "amount_cents" integer NOT NULL,
        "currency" char(3) NOT NULL,
        "paid_by" varchar(64) NOT NULL,
        "spent_on" date NOT NULL,
        "description" varchar(200) NULL,
        "category" varchar(16) NULL,
        "split_type" varchar(16) NOT NULL,
        "created_by" varchar(64) NOT NULL,
        "updated_by" varchar(64) NOT NULL,
        "deleted_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        CONSTRAINT "pk_expenses" PRIMARY KEY ("id"),
        CONSTRAINT "ck_expenses_amount_positive" CHECK ("amount_cents" > 0),
        CONSTRAINT "ck_expenses_category" CHECK (
          "category" IS NULL OR "category" IN (
            'food', 'home', 'transport', 'leisure', 'health',
            'travel', 'shopping', 'bills', 'other'
          )
        ),
        CONSTRAINT "ck_expenses_split_type" CHECK (
          "split_type" IN ('EQUAL', 'OTHER_OWES_ALL')
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_group_deleted" ON "expenses" ("group_id", "deleted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "expenses"`);
  }
}
