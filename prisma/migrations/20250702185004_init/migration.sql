-- CreateTable
CREATE TABLE "rankings" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rankings_pkey" PRIMARY KEY ("id")
);
