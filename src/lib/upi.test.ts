import { describe, expect, it } from "vitest";
import { isUpiId, normalizeUpiId, upiPayUrl } from "./upi";

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
