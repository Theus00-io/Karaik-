import { describe, expect, it } from "vitest";
import { formatCPF, unmaskCPF, validateCPF } from "./cpf";

describe("CPF helpers", () => {
  it("validates verifier digits and rejects repeated digits", () => {
    expect(validateCPF("52998224725")).toBe(true);
    expect(validateCPF("52998224724")).toBe(false);
    expect(validateCPF("11111111111")).toBe(false);
  });

  it("formats and unmasks without preserving unexpected characters", () => {
    expect(formatCPF("52998224725")).toBe("529.982.247-25");
    expect(unmaskCPF("529.982.247-25")).toBe("52998224725");
  });
});
