-- PG 거래 식별자 유니크(웹훅 오매칭·중복 방지). NULL은 다중 허용(PostgreSQL 기본)
CREATE UNIQUE INDEX "course_purchases_payment_id_key" ON "course_purchases"("payment_id");
