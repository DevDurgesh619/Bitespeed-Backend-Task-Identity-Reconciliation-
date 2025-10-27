/*
  Warnings:

  - You are about to drop the column `deletedAt` on the `Contact` table. All the data in the column will be lost.
  - Changed the type of `linkPrecedence` on the `Contact` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "LinkPrecedence" AS ENUM ('PRIMARY', 'SECONDARY');

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "deletedAt",
DROP COLUMN "linkPrecedence",
ADD COLUMN     "linkPrecedence" "LinkPrecedence" NOT NULL;

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Contact_phoneNumber_idx" ON "Contact"("phoneNumber");

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_linkedId_fkey" FOREIGN KEY ("linkedId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
