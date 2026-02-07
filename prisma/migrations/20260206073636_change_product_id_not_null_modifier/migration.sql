/*
  Warnings:

  - Made the column `product_id` on table `product_modifiers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "product_modifiers" ALTER COLUMN "product_id" SET NOT NULL;
