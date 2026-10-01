import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupMemberships1780000000000 implements MigrationInterface {
  name = 'CreateGroupMemberships1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "group_memberships" (
        "group_id" uuid NOT NULL,
        "capacity" integer NOT NULL DEFAULT 2,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        CONSTRAINT "pk_group_memberships" PRIMARY KEY ("group_id"),
        CONSTRAINT "ck_group_memberships_capacity" CHECK ("capacity" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "group_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "group_id" uuid NOT NULL,
        "user_id" varchar(64) NOT NULL,
        "role" varchar(16) NOT NULL,
        "joined_at" timestamptz NOT NULL,
        CONSTRAINT "pk_group_members" PRIMARY KEY ("id"),
        CONSTRAINT "uq_group_members_group_id_user_id" UNIQUE ("group_id", "user_id"),
        CONSTRAINT "ck_group_members_role" CHECK ("role" IN ('OWNER', 'MEMBER')),
        CONSTRAINT "fk_group_members_group_id" FOREIGN KEY ("group_id")
          REFERENCES "group_memberships" ("group_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_group_members_user_id" ON "group_members" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "group_members"`);
    await queryRunner.query(`DROP TABLE "group_memberships"`);
  }
}
