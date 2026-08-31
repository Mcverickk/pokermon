const VPA_RE = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z0-9]{2,64}$/;

export function normalizeUpiId(value: string): string {
  return value.trim().toLowerCase();
}

export function isUpiId(value: string): boolean {
  return VPA_RE.test(normalizeUpiId(value));
}

export type UpiPayInput = {
  pa: string;
  pn: string;
  am: number;
  tn: string;
};

export type PayPlatform = "ios" | "android";

export type UpiApp = {
  id: string;
  label: string;
  android: string;
  ios: string;
  color: string;
};

/** App-specific schemes so iOS Safari can open the installed UPI app. */
export const UPI_APPS: UpiApp[] = [
  {
    id: "phonepe",
    label: "PhonePe",
    android: "phonepe://pay",
    ios: "phonepe://pay",
    color: "#5f259f",
  },
  {
    id: "gpay",
    label: "GPay",
    android: "tez://upi/pay",
    ios: "gpay://upi/pay",
    color: "#1a73e8",
  },
  {
    id: "paytm",
    label: "Paytm",
    android: "paytmmp://pay",
    ios: "paytm://pay",
    color: "#00baf2",
  },
  {
    id: "cred",
    label: "CRED",
    android: "credpay://upi/pay",
    ios: "cred://pay",
    color: "#c9a227",
  },
  {
    id: "supermoney",
    label: "super.money",
    android: "super.money://pay",
    ios: "supermoney://pay",
    color: "#f5c518",
  },
  {
    id: "other",
    label: "Any UPI app",
    android: "upi://pay",
    ios: "upi://pay",
    color: "#d4b06a",
  },
];

export function upiQuery(input: UpiPayInput): string {
  return [
    `pa=${input.pa}`,
    `pn=${encodeURIComponent(input.pn)}`,
    `am=${input.am}`,
    "cu=INR",
    `tn=${encodeURIComponent(input.tn)}`,
  ].join("&");
}

export function upiPayUrl(input: UpiPayInput): string {
  return `upi://pay?${upiQuery(input)}`;
}

export function upiAppUrl(
  app: UpiApp,
  input: UpiPayInput,
  platform: PayPlatform,
): string {
  const base = platform === "ios" ? app.ios : app.android;
  return `${base}?${upiQuery(input)}`;
}

export function detectPayPlatform(
  userAgent: string | undefined,
): PayPlatform {
  if (userAgent && /iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  return "android";
}
