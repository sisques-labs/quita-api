import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroups1780000000001 implements MigrationInterface {
  name = 'CreateGroups1780000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "groups" (
        "id" uuid NOT NULL,
        "name" varchar(80) NOT NULL,
        "created_by" varchar(64) NOT NULL,
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        CONSTRAINT "pk_groups" PRIMARY KEY ("id"),
        CONSTRAINT "ck_groups_name_not_blank" CHECK (length(btrim("name")) > 0)
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_groups_created_by" ON "groups" ("created_by")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "groups"`);
  }
}
