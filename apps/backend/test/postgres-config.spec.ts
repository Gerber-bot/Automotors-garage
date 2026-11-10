import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePostgresPoolConfig } from '../src/infrastructure/database/postgres-config.ts';

describe('PostgreSQL pool configuration', () => {
  it('requires explicit production URL identity and never echoes secrets', () => {
    const invalid = [
      'postgresql://db.example.test/garage',
      'postgresql://garage@db.example.test/garage',
      'postgresql://:private-secret@db.example.test/garage',
      'postgresql://garage:private-secret@db.example.test/',
      'postgresql://garage:private-secret@bad_host/garage',
      'postgresql://garage:private-secret@db.example.test/%20',
      'postgresql://garage:%20@db.example.test/garage',
      'postgresql://garage:private-secret@db.example.test/%ZZ',
      'postgresql://garage:private-secret@db.example.test:0/garage',
      'postgresql://garage:private-secret@db.example.test/garage?password=',
      'postgresql://garage:private-secret@db.example.test/garage?host=other',
      'postgresql://garage:private-secret@db.example.test:99999/garage',
      'https://garage:private-secret@db.example.test/garage',
      ' ',
    ];
    for (const url of invalid) {
      assert.throws(() => resolvePostgresPoolConfig({ DATABASE_URL: url }, 'production'), (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /DATABASE_URL/);
        assert.doesNotMatch(error.message, /private-secret|db\.example|%ZZ/);
        return true;
      });
    }
  });

  it('accepts explicit encoded credentials, IPv6, and SSL options without changing local URL behavior', () => {
    for (const url of [
      'postgres://garage:p%40ss@localhost/garage?sslmode=require',
      'postgresql://garage:secret@[::1]:5432/garage',
    ]) {
      assert.deepEqual(resolvePostgresPoolConfig({ DATABASE_URL: url }, 'production'), { connectionString: url });
    }
    assert.deepEqual(resolvePostgresPoolConfig({ DATABASE_URL: 'postgres://localhost/local' }, 'test'), {
      connectionString: 'postgres://localhost/local',
    });
  });
  it('accepts an explicit PostgreSQL URL in production', () => {
    assert.deepEqual(
      resolvePostgresPoolConfig({ DATABASE_URL: 'postgresql://garage:secret@db.example.test:5432/garage' }, 'production'),
      { connectionString: 'postgresql://garage:secret@db.example.test:5432/garage' }
    );
  });

  it('accepts complete explicit production settings and legacy variable aliases', () => {
    assert.deepEqual(
      resolvePostgresPoolConfig({
        POSTGRES_HOST: 'db.example.test',
        POSTGRES_USER: 'garage',
        POSTGRES_PASSWORD: 'secret',
        POSTGRES_DB: 'garage',
        POSTGRES_PORT: '5544',
      }, 'production'),
      { host: 'db.example.test', port: 5544, user: 'garage', password: 'secret', database: 'garage' }
    );
  });

  it('fails explicitly in production when credentials or required connection settings are missing', () => {
    assert.throws(
      () => resolvePostgresPoolConfig({}, 'production'),
      /requires DATABASE_URL or explicit DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME/
    );
    assert.throws(
      () => resolvePostgresPoolConfig({ DATABASE_HOST: 'db.example.test', DATABASE_USER: 'garage', DATABASE_NAME: 'garage' }, 'production'),
      /DATABASE_PASSWORD/
    );
  });

  it('rejects malformed URLs and invalid ports instead of silently normalizing them', () => {
    assert.throws(
      () => resolvePostgresPoolConfig({ DATABASE_URL: 'https://example.test/garage' }, 'production'),
      /valid PostgreSQL connection URL/
    );
    assert.throws(
      () => resolvePostgresPoolConfig({ DATABASE_PORT: 'not-a-port' }, 'development'),
      /DATABASE_PORT must be an integer/
    );
  });

  it('preserves the existing local-development defaults', () => {
    assert.deepEqual(resolvePostgresPoolConfig({}, 'development'), {
      host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'automotors_garage',
    });
  });
});
