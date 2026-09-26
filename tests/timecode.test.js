import { test } from "node:test";
import assert from "node:assert/strict";

import { FRAME_RATES, formatTimecode, supportsDropFrame } from "../src/timecode.js";

const NDF_2997 = { frameRate: "29.97", isDropFrame: false };
const DF_2997 = { frameRate: "29.97", isDropFrame: true };
const DF_5994 = { frameRate: "59.94", isDropFrame: true };

// formatTimecode: 正常系

test("30fpsで1300ミリ秒は39フレームなので00:00:01:09になる", () => {
  const timecode = formatTimecode(1300, { frameRate: "30", isDropFrame: false });

  assert.equal(timecode, "00:00:01:09");
});

test("24fpsで500ミリ秒は00:00:00:12になる", () => {
  const timecode = formatTimecode(500, { frameRate: "24", isDropFrame: false });

  assert.equal(timecode, "00:00:00:12");
});

test("23.976fpsノンドロップで1000ミリ秒は00:00:01:00になる", () => {
  const timecode = formatTimecode(1000, { frameRate: "23.976", isDropFrame: false });

  assert.equal(timecode, "00:00:01:00");
});

test("29.97fpsノンドロップで1時間は本当の時間より遅れて00:59:56:12になる", () => {
  const timecode = formatTimecode(3600000, NDF_2997);

  assert.equal(timecode, "00:59:56:12");
});

test("29.97fpsドロップで1時間は01:00:00;00になる", () => {
  const timecode = formatTimecode(3600000, DF_2997);

  assert.equal(timecode, "01:00:00;00");
});

test("29.97fpsドロップで1800フレーム目は;00と;01を飛ばして00:01:00;02になる", () => {
  const timecode = formatTimecode(60060, DF_2997);

  assert.equal(timecode, "00:01:00;02");
});

test("59.94fpsドロップで3600フレーム目は4つ飛ばして00:01:00;04になる", () => {
  const timecode = formatTimecode(60060, DF_5994);

  assert.equal(timecode, "00:01:00;04");
});

// formatTimecode: 境界値

test("29.97fpsドロップで1799フレーム目は飛ばす直前の00:00:59;29になる", () => {
  const timecode = formatTimecode(60027, DF_2997);

  assert.equal(timecode, "00:00:59;29");
});

test("29.97fpsドロップで10分ちょうどは飛ばさず00:10:00;00になる", () => {
  const timecode = formatTimecode(600001, DF_2997);

  assert.equal(timecode, "00:10:00;00");
});

test("0ミリ秒はノンドロップで00:00:00:00になる", () => {
  const timecode = formatTimecode(0, NDF_2997);

  assert.equal(timecode, "00:00:00:00");
});

test("0ミリ秒はドロップで00:00:00;00になる", () => {
  const timecode = formatTimecode(0, DF_2997);

  assert.equal(timecode, "00:00:00;00");
});

test("0.48フレーム分の16ミリ秒は0フレームに丸められる", () => {
  const timecode = formatTimecode(16, NDF_2997);

  assert.equal(timecode, "00:00:00:00");
});

test("0.51フレーム分の17ミリ秒は1フレームに丸められる", () => {
  const timecode = formatTimecode(17, NDF_2997);

  assert.equal(timecode, "00:00:00:01");
});

// formatTimecode: 異常系

test("負の時刻を渡すとRangeErrorになる", () => {
  assert.throws(() => formatTimecode(-1, NDF_2997), RangeError);
});

test("整数でない時刻を渡すとTypeErrorになる", () => {
  assert.throws(() => formatTimecode(1.5, NDF_2997), TypeError);
});

test("一覧にないフレームレートを渡すとErrorになる", () => {
  assert.throws(
    () => formatTimecode(0, { frameRate: "25", isDropFrame: false }),
    /対応していないフレームレートです: 25/,
  );
});

test("30fpsでドロップを指定するとErrorになる", () => {
  assert.throws(
    () => formatTimecode(0, { frameRate: "30", isDropFrame: true }),
    /ドロップフレームは 29.97 \/ 59.94 だけです/,
  );
});

// supportsDropFrame

test("29.97と59.94はドロップフレームに対応している", () => {
  const supported = ["29.97", "59.94"].map(supportsDropFrame);

  assert.deepEqual(supported, [true, true]);
});

test("30と24と23.976はドロップフレームに対応していない", () => {
  const supported = ["30", "24", "23.976"].map(supportsDropFrame);

  assert.deepEqual(supported, [false, false, false]);
});

// FRAME_RATES

test("選択肢は設計書どおりの5つで最初が29.97になっている", () => {
  assert.deepEqual(FRAME_RATES, ["29.97", "30", "23.976", "24", "59.94"]);
});
