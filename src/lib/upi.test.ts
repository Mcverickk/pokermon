import { describe, expect, it } from "vitest";
import {
  detectPayPlatform,
  isUpiId,
  normalizeUpiId,
  UPI_APPS,
  upiAppUrl,
  upiPayUrl,
} from "./upi";

describe("UPI ID", () => {
  it("accepts a typical VPA", () => {
    expect(isUpiId("chirag@okicici")).toBe(true);
    expect(isUpiId("  Rohit-yadav@ybl  ")).toBe(true);
  });

  it("rejects junk", () => {
    expect(isUpiId("")).toBe(false);
    expect(isUpiId("chirag")).toBe(false);
    expect(isUpiId("chirag@")).toBe(false);
    expect(isUpiId("@okicici")).toBe(false);
    expect(isUpiId("chi rag@okicici")).toBe(false);
  });

  it("normalizes to lowercase", () => {
    expect(normalizeUpiId(" Chirag@OkIcIcI ")).toBe("chirag@okicici");
  });
});

describe("upiPayUrl", () => {
  it("builds an NPCI intent with encoded fields", () => {
    expect(
      upiPayUrl({
        pa: "murli@okicici",
        pn: "Murli",
        am: 1640,
        tn: "Pokermon Mon, 11 Aug, 2026",
      }),
    ).toBe(
      "upi://pay?pa=murli@okicici&pn=Murli&am=1640&cu=INR&tn=Pokermon%20Mon%2C%2011%20Aug%2C%202026",
    );
  });
});

describe("upiAppUrl", () => {
  const input = {
    pa: "murli@okicici",
    pn: "Murli",
    am: 1640,
    tn: "Pokermon night",
  };

  it("uses PhonePe the same way on iOS and Android", () => {
    const phonepe = UPI_APPS.find((app) => app.id === "phonepe")!;
    expect(upiAppUrl(phonepe, input, "ios")).toBe(
      "phonepe://pay?pa=murli@okicici&pn=Murli&am=1640&cu=INR&tn=Pokermon%20night",
    );
    expect(upiAppUrl(phonepe, input, "android")).toBe(
      "phonepe://pay?pa=murli@okicici&pn=Murli&am=1640&cu=INR&tn=Pokermon%20night",
    );
  });

  it("uses GPay / Tez schemes per platform", () => {
    const gpay = UPI_APPS.find((app) => app.id === "gpay")!;
    expect(upiAppUrl(gpay, input, "ios")).toContain("gpay://upi/pay?");
    expect(upiAppUrl(gpay, input, "android")).toContain("tez://upi/pay?");
  });

  it("uses Paytm, CRED, and super.money iOS schemes", () => {
    const paytm = UPI_APPS.find((app) => app.id === "paytm")!;
    const cred = UPI_APPS.find((app) => app.id === "cred")!;
    const superMoney = UPI_APPS.find((app) => app.id === "supermoney")!;
    expect(upiAppUrl(paytm, input, "ios")).toContain("paytm://pay?");
    expect(upiAppUrl(cred, input, "ios")).toContain("cred://pay?");
    expect(upiAppUrl(superMoney, input, "ios")).toContain("supermoney://pay?");
  });
});

describe("detectPayPlatform", () => {
  it("treats iPhone as iOS", () => {
    expect(detectPayPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)")).toBe(
      "ios",
    );
  });

  it("treats others as Android", () => {
    expect(detectPayPlatform("Mozilla/5.0 (Linux; Android 14)")).toBe(
      "android",
    );
  });
});
