-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "toggles" JSONB NOT NULL DEFAULT '{}';
