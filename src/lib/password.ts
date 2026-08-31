import { hashSecret, verifySecret } from "./pin";

const MIN_LEN = 4;

export function isUsablePassword(password: string): boolean {
  return password.length >= MIN_LEN;
}

export async function hashPassword(password: string): Promise<string> {
  return hashSecret(password);
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  return verifySecret(password, stored);
}
