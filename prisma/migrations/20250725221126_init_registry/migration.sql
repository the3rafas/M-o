-- CreateTable
CREATE TABLE "Registry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalPrice" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "RegistryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "subTotal" REAL NOT NULL,
    "registryId" INTEGER NOT NULL,
    CONSTRAINT "RegistryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RegistryItem_registryId_fkey" FOREIGN KEY ("registryId") REFERENCES "Registry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
