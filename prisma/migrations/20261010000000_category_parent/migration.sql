-- One level of category nesting: Women > Unstitched, Fabric > Lawn, and so on.

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Category_parentId_sortOrder_idx" ON "Category"("parentId", "sortOrder");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
