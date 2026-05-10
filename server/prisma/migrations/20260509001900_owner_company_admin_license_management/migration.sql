-- DropForeignKey
ALTER TABLE "license_activations" DROP CONSTRAINT "license_activations_license_id_fkey";

-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "license_activations" ADD CONSTRAINT "license_activations_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
