import { test } from "node:test";
import assert from "node:assert/strict";

import { findActiveSubtitles } from "../src/active-subtitles.js";

function subtitle(number, startMs, endMs) {
  return { number, startMs, endMs, text: `字幕${number}` };
}

const FIRST = subtitle(1, 1000, 3000);
const SECOND = subtitle(2, 4000, 6000);
// ドラえもん #4・#5 のように時間が重なる字幕
const OVERLAP_A = subtitle(4, 11333, 12877);
const OVERLAP_B = subtitle(5, 12432, 14208);

// 正常系

test("字幕の途中の時刻ではその字幕1件が返る", () => {
  const subtitles = [FIRST, SECOND];

  const active = findActiveSubtitles(subtitles, 2000);

  assert.deepEqual(active, [FIRST]);
});

test("2件が重なる時刻ではファイル順に2件が返る", () => {
  const subtitles = [OVERLAP_A, OVERLAP_B];

  const active = findActiveSubtitles(subtitles, 12500);

  assert.deepEqual(active, [OVERLAP_A, OVERLAP_B]);
});

test("字幕と字幕の間の時刻では空の配列が返る", () => {
  const subtitles = [FIRST, SECOND];

  const active = findActiveSubtitles(subtitles, 3500);

  assert.deepEqual(active, []);
});

// 境界値

test("開始時刻ちょうどではその字幕を含む", () => {
  const subtitles = [FIRST];

  const active = findActiveSubtitles(subtitles, 1000);

  assert.deepEqual(active, [FIRST]);
});

test("終了時刻ちょうどではその字幕を含まない", () => {
  const subtitles = [FIRST];

  const active = findActiveSubtitles(subtitles, 3000);

  assert.deepEqual(active, []);
});

test("長さ0秒の字幕はその時刻でも含まない", () => {
  const subtitles = [subtitle(163, 451468, 451468)];

  const active = findActiveSubtitles(subtitles, 451468);

  assert.deepEqual(active, []);
});

test("終了が開始より前の字幕はその間の時刻でも含まない", () => {
  const subtitles = [subtitle(48, 25634, 25594)];

  const active = findActiveSubtitles(subtitles, 25600);

  assert.deepEqual(active, []);
});

test("字幕が0件なら空の配列が返る", () => {
  const subtitles = [];

  const active = findActiveSubtitles(subtitles, 1000);

  assert.deepEqual(active, []);
});

// 異常系

test("時刻が数値でないとTypeErrorになる", () => {
  const subtitles = [FIRST];

  const act = () => findActiveSubtitles(subtitles, "1000");

  assert.throws(act, TypeError);
});

test("時刻がNaNだとTypeErrorになる", () => {
  const subtitles = [FIRST];

  const act = () => findActiveSubtitles(subtitles, Number.NaN);

  assert.throws(act, TypeError);
});

test("字幕が配列でないとTypeErrorになる", () => {
  const notArray = FIRST;

  const act = () => findActiveSubtitles(notArray, 1000);

  assert.throws(act, TypeError);
});
