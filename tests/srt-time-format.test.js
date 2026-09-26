import { test } from "node:test";
import assert from "node:assert/strict";

import { formatSrtTime } from "../src/srt-time-format.js";

// 正常系

test("62345ミリ秒は00:01:02,345になる", () => {
  const ms = 62345;

  const text = formatSrtTime(ms);

  assert.equal(text, "00:01:02,345");
});

test("1時間2分3秒4ミリ秒は01:02:03,004になる", () => {
  const ms = 3723004;

  const text = formatSrtTime(ms);

  assert.equal(text, "01:02:03,004");
});

// 境界値

test("0ミリ秒は00:00:00,000になる", () => {
  const ms = 0;

  const text = formatSrtTime(ms);

  assert.equal(text, "00:00:00,000");
});

// 異常系

test("負の数はRangeErrorになる", () => {
  const ms = -1;

  const act = () => formatSrtTime(ms);

  assert.throws(act, RangeError);
});

test("整数でない数はTypeErrorになる", () => {
  const ms = 1.5;

  const act = () => formatSrtTime(ms);

  assert.throws(act, TypeError);
});

test("NaNはTypeErrorになる", () => {
  const ms = Number.NaN;

  const act = () => formatSrtTime(ms);

  assert.throws(act, TypeError);
});

test("数値でない値はTypeErrorになる", () => {
  const ms = "62345";

  const act = () => formatSrtTime(ms);

  assert.throws(act, TypeError);
});
