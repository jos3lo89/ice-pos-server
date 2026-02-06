/*
  Warnings:

  - Made the column `product_id` on table `product_variants` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "product_id" SET NOT NULL;
