import { describe, expect, it } from "vitest";
import { formatScore, isValidScore, parseScore, toScoreRaw } from "./score";

describe("formatScore", () => {
  it.each([
    [8.5, "8,5"],
    [9, "9,0"],
    [10, "10,0"],
    [1, "1,0"],
  ])("%s → %s", (score, text) => {
    expect(formatScore(score)).toBe(text);
  });
});

describe("parseScore", () => {
  it.each([
    ["8,5", 8.5],
    ["8.5", 8.5],
    [" 7 ", 7],
    ["10,0", 10],
    ["1,0", 1],
    ["", 0],
    ["  ", 0],
  ])("%j → %s", (text, score) => {
    expect(parseScore(text)).toBe(score);
  });

  it.each(["8,55", "10,5", "0,5", "0", "11", "-1", "8,", "otto", "8,5,1", "1e1"])("refuses %j", (text) => {
    expect(parseScore(text)).toBeUndefined();
  });
});

describe("isValidScore", () => {
  it.each([0, 1, 8.5, 8.3, 9.9, 10])("accepts %s", (score) => {
    expect(isValidScore(score)).toBe(true);
  });

  it.each([0.5, 8.55, 10.1, -1, Number.NaN, "8.5", null])("refuses %s", (score) => {
    expect(isValidScore(score)).toBe(false);
  });
});

describe("toScoreRaw", () => {
  it.each([
    [8.5, 85],
    [8.3, 83],
    [10, 100],
    [0, 0],
  ])("%s → %s", (score, raw) => {
    expect(toScoreRaw(score)).toBe(raw);
  });
});
