import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGroupInvitationCodes1780000000002 implements MigrationInterface {
  name = 'CreateGroupInvitationCodes1780000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "group_invitation_codes" (
        "id" uuid NOT NULL,
        "group_id" uuid NOT NULL,
        "code" varchar(8) NOT NULL,
        "created_by" varchar(64) NOT NULL,
        "revoked_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL,
        "updated_at" timestamptz NOT NULL,
        CONSTRAINT "pk_group_invitation_codes" PRIMARY KEY ("id"),
        CONSTRAINT "uq_group_invitation_codes_code" UNIQUE ("code")
      )
    `);
    // One active (non-revoked) code per group, enforced by the database.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_group_invitation_codes_active_group"
      ON "group_invitation_codes" ("group_id")
      WHERE "revoked_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "group_invitation_codes"`);
  }
}
