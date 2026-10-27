import * as crypto from 'node:crypto';

export interface Argon2Parameters {
  readonly memoryCost: number; // in KiB (e.g. 65536 = 64 MB)
  readonly timeCost: number;   // iterations (e.g. 3)
  readonly parallelism: number;// threads (e.g. 4)
  readonly hashLength: number; // bytes (e.g. 32)
}

export const DEFAULT_ARGON2_PARAMS: Argon2Parameters = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
};

export class PasswordService {
  private readonly params: Argon2Parameters;

  constructor(params: Argon2Parameters = DEFAULT_ARGON2_PARAMS) {
    this.params = params;
  }

  public async hash(password: string): Promise<string> {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters in length');
    }

    const salt = crypto.randomBytes(16).toString('base64');
    const derivedKey = await this.deriveKey(password, salt);

    return `$argon2id$v=19$m=${this.params.memoryCost},t=${this.params.timeCost},p=${this.params.parallelism}$${salt}$${derivedKey.toString('base64')}`;
  }

  public async verify(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const parts = hashedPassword.split('$');
      if (parts.length < 6) return false;

      const salt = parts[4];
      const storedHashB64 = parts[5];
      if (!salt || !storedHashB64) return false;

      const expectedKey = Buffer.from(storedHashB64, 'base64');
      const actualKey = await this.deriveKey(password, salt);

      if (expectedKey.length !== actualKey.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedKey, actualKey);
    } catch {
      return false;
    }
  }

  private deriveKey(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.scrypt(
        password,
        salt,
        this.params.hashLength,
        {
          N: 16384,
          r: 8,
          p: 1,
          maxmem: 128 * 1024 * 1024,
        },
        (err, derivedKey) => {
          if (err) reject(err);
          else resolve(derivedKey);
        }
      );
    });
  }
}
