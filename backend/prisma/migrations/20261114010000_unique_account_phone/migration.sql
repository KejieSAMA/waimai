-- NULL remains available for accounts without a contact phone.
-- Stop deployment on existing duplicates rather than changing account data.
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
