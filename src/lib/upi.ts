const VPA_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9]{2,64}$/;

export function normalizeUpiId(value: string): string {
  return value.trim().toLowerCase();
}

export function isUpiId(value: string): boolean {
  return VPA_RE.test(normalizeUpiId(value));
}

export function upiPayUrl(input: {
  pa: string;
  pn: string;
  am: number;
  tn: string;
}): string {
  const query = [
    `pa=${input.pa}`,
    `pn=${encodeURIComponent(input.pn)}`,
    `am=${input.am}`,
    "cu=INR",
    `tn=${encodeURIComponent(input.tn)}`,
  ].join("&");
  return `upi://pay?${query}`;
}
