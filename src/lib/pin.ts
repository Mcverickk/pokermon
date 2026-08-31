import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const PIN_RE = /^\d{4}$/;

export function isFourDigitPin(pin: string): boolean {
  return PIN_RE.test(pin);
}

export async function hashSecret(value: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(value, salt, 32)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifySecret(
  value: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scryptAsync(value, salt, 32)) as Buffer;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function hashPin(pin: string): Promise<string> {
  return hashSecret(pin);
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  return verifySecret(pin, stored);
}
