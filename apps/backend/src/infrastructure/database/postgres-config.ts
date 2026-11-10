import { isIP } from 'node:net';

export interface PostgresPoolConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

/** Resolves PostgreSQL settings while keeping legacy defaults local-development only. */
export function resolvePostgresPoolConfig(
  env: NodeJS.ProcessEnv,
  nodeEnv = env.NODE_ENV ?? 'development'
): PostgresPoolConfig {
  const connectionString = env.DATABASE_URL?.trim();
  const invalidUrl = () => new Error('DATABASE_URL must contain a valid PostgreSQL host and explicit user, password, and database in production.');
  if (nodeEnv === 'production' && env.DATABASE_URL !== undefined && !connectionString) {
    throw invalidUrl();
  }
  if (connectionString) {
    let parsed: URL;
    try {
      parsed = new URL(connectionString);
    } catch {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
    }
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) {
      throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
    }
    if (nodeEnv === 'production') {
      try {
        const host = parsed.hostname.replace(/^\[|\]$/g, '');
        const validHost = isIP(host) !== 0 || (host.length <= 253 && host.split('.').every(
          (label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)
        ));
        const explicit = [parsed.username, parsed.password, parsed.pathname.slice(1)]
          .map((value) => decodeURIComponent(value))
          .every((value) => value.trim().length > 0 && ![...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127));
        const overridesIdentity = [...parsed.searchParams.keys()].some((key) =>
          ['host', 'hostaddr', 'port', 'user', 'password', 'database', 'dbname', 'service'].includes(key.toLowerCase())
        );
        if (!validHost || !explicit || overridesIdentity || (parsed.port !== '' && Number(parsed.port) < 1)) throw invalidUrl();
      } catch {
        // URL parser and decoding errors must never echo credentials.
        throw invalidUrl();
      }
    }
    return { connectionString };
  }

  const host = env.DATABASE_HOST?.trim() || env.POSTGRES_HOST?.trim();
  const user = env.DATABASE_USER?.trim() || env.POSTGRES_USER?.trim();
  const password = env.DATABASE_PASSWORD || env.POSTGRES_PASSWORD;
  const database = env.DATABASE_NAME?.trim() || env.POSTGRES_DB?.trim();

  if (nodeEnv === 'production') {
    const missing = [
      ...(!host ? ['DATABASE_HOST'] : []),
      ...(!user ? ['DATABASE_USER'] : []),
      ...(password === undefined || password.length === 0 ? ['DATABASE_PASSWORD'] : []),
      ...(!database ? ['DATABASE_NAME'] : []),
    ];
    if (missing.length > 0) {
      throw new Error(
        `Production PostgreSQL requires DATABASE_URL or explicit ${missing.join(', ')} configuration.`
      );
    }
  }

  const rawPort = env.DATABASE_PORT?.trim() || env.POSTGRES_PORT?.trim();
  const port = rawPort ? Number(rawPort) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DATABASE_PORT must be an integer between 1 and 65535.');
  }

  return {
    host: host || 'localhost',
    port,
    user: user || 'postgres',
    password: password || 'postgres',
    database: database || 'automotors_garage',
  };
}
