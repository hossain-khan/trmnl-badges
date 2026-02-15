import { describe, it, expect } from "vitest";
import { formatNumber, compactNumberFormatter } from "../src/utils";

describe("Utils", () => {
  describe("formatNumber", () => {
    describe("without pretty formatting", () => {
      it("should format small numbers with locale separation", () => {
        expect(formatNumber(0)).toBe("0");
      });

      it("should format single digit numbers", () => {
        expect(formatNumber(5)).toBe("5");
      });

      it("should format two digit numbers", () => {
        expect(formatNumber(42)).toBe("42");
      });

      it("should format three digit numbers", () => {
        expect(formatNumber(100)).toBe("100");
      });

      it("should add locale separator for thousands", () => {
        expect(formatNumber(1000)).toBe("1,000");
      });

      it("should add locale separator for millions", () => {
        expect(formatNumber(1000000)).toBe("1,000,000");
      });

      it("should add locale separator for large numbers", () => {
        expect(formatNumber(1500)).toBe("1,500");
      });

      it("should add locale separator for larger numbers", () => {
        expect(formatNumber(250000)).toBe("250,000");
      });
    });

    describe("with pretty formatting enabled", () => {
      it("should format small numbers as-is", () => {
        expect(formatNumber(5, true)).toBe("5");
      });

      it("should format 999 without compact notation", () => {
        expect(formatNumber(999, true)).toBe("999");
      });

      it("should format 1000 as 1K", () => {
        expect(formatNumber(1000, true)).toBe("1K");
      });

      it("should format 1500 as 1.5K", () => {
        expect(formatNumber(1500, true)).toBe("1.5K");
      });

      it("should format 7000 as 7K", () => {
        expect(formatNumber(7000, true)).toBe("7K");
      });

      it("should format 1000000 as 1M", () => {
        expect(formatNumber(1000000, true)).toBe("1M");
      });

      it("should format 1500000 as 1.5M", () => {
        expect(formatNumber(1500000, true)).toBe("1.5M");
      });

      it("should format 1000000000 as 1B", () => {
        expect(formatNumber(1000000000, true)).toBe("1B");
      });

      it("should format 250 as 250 (below 1K threshold)", () => {
        expect(formatNumber(250, true)).toBe("250");
      });
    });

    describe("compactNumberFormatter", () => {
      it("should use compact notation with short display", () => {
        // Verify it's configured correctly by testing through the formatter
        const result = compactNumberFormatter.format(1500);
        expect(result).toBe("1.5K");
      });

      it("should have proper significant digits", () => {
        // Test that significant digits are limited to 3
        const result = compactNumberFormatter.format(1500000);
        expect(result).toBe("1.5M");
      });
    });
  });
});
// test comment
