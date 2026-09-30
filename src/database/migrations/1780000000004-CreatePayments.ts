import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePayments1780000000004 implements MigrationInterface {
  name = 'CreatePayments1780000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // No foreign key to `groups`: that table belongs to another context.
    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        "from_user_id" varchar(64) NOT NULL,
        "to_user_id" varchar(64) NOT NULL,
        "amount_cents" integer NOT NULL,
        "currency" char(3) NOT NULL,
        "paid_on" date NOT NULL,
        "note" varchar(200) NULL,
        "created_by" varchar(64) NOT NULL,
        "updated_by" varchar(64) NOT NULL,
        "deleted_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        CONSTRAINT "pk_payments" PRIMARY KEY ("id"),
        CONSTRAINT "ck_payments_amount_positive" CHECK ("amount_cents" > 0),
        CONSTRAINT "ck_payments_parties_differ" CHECK ("from_user_id" <> "to_user_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_payments_group_deleted" ON "payments" ("group_id", "deleted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payments"`);
  }
}
