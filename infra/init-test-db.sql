-- Creates a separate test database so pytest can run against a fresh
-- pgvector instance without touching the production labproof database.
CREATE USER labproof_test WITH PASSWORD 'labproof_test';
CREATE DATABASE labproof_test OWNER labproof_test;
GRANT ALL PRIVILEGES ON DATABASE labproof_test TO labproof_test;