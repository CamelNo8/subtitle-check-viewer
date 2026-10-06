import { test } from "node:test";
import assert from "node:assert/strict";

import { decodeText } from "../src/text-decoder.js";

const UTF8_BOM = [0xef, 0xbb, 0xbf];
// Shift_JIS で「字幕」を表すバイト列
const SHIFT_JIS_JIMAKU = [0x8e, 0x9a, 0x96, 0x8b];
// Shift_JIS（Windows の拡張）で「①」を表すバイト列
const SHIFT_JIS_CIRCLED_ONE = [0x87, 0x40];
// Shift_JIS で半角の「ｱ」を表すバイト列
const SHIFT_JIS_HALF_WIDTH_A = [0xb1];
// UTF-16 の BOM。UTF-8 でも Shift_JIS でも使われないバイトの並び
const UTF16_BOM = [0xff, 0xfe];

// 正常系

test("UTF-8の日本語はUTF-8として読める", () => {
  const bytes = new TextEncoder().encode("字幕");

  const decoded = decodeText(bytes);

  assert.deepEqual(decoded, { text: "字幕", encoding: "UTF-8" });
});

test("BOM付きのUTF-8はBOMを除いた文字列になる", () => {
  const bytes = new Uint8Array([...UTF8_BOM, ...new TextEncoder().encode("字幕")]);

  const decoded = decodeText(bytes);

  assert.deepEqual(decoded, { text: "字幕", encoding: "UTF-8" });
});

test("Shift_JISの日本語はShift_JISとして読める", () => {
  const bytes = new Uint8Array(SHIFT_JIS_JIMAKU);

  const decoded = decodeText(bytes);

  assert.deepEqual(decoded, { text: "字幕", encoding: "Shift_JIS" });
});

test("Shift_JISの丸数字（Windowsの拡張文字）も読める", () => {
  const bytes = new Uint8Array(SHIFT_JIS_CIRCLED_ONE);

  const decoded = decodeText(bytes);

  assert.deepEqual(decoded, { text: "①", encoding: "Shift_JIS" });
});

test("Shift_JISの半角カタカナも読める", () => {
  const bytes = new Uint8Array(SHIFT_JIS_HALF_WIDTH_A);

  const decoded = decodeText(bytes);

  assert.deepEqual(decoded, { text: "ｱ", encoding: "Shift_JIS" });
});

test("ArrayBufferを渡しても読める", () => {
  const buffer = new Uint8Array(SHIFT_JIS_JIMAKU).buffer;

  const decoded = decodeText(buffer);

  assert.deepEqual(decoded, { text: "字幕", encoding: "Shift_JIS" });
});

// 境界値

test("0バイトを渡すと空文字でUTF-8になる", () => {
  const bytes = new Uint8Array([]);

  const decoded = decodeText(bytes);

  assert.deepEqual(decoded, { text: "", encoding: "UTF-8" });
});

test("英数字だけのファイルはUTF-8になる", () => {
  const bytes = new TextEncoder().encode("abc123");

  const decoded = decodeText(bytes);

  assert.deepEqual(decoded, { text: "abc123", encoding: "UTF-8" });
});

// 異常系

test("UTF-8でもShift_JISでもないバイト列を渡すとエラーになる", () => {
  const bytes = new Uint8Array(UTF16_BOM);

  const act = () => decodeText(bytes);

  assert.throws(act, {
    name: "Error",
    message:
      "文字コードが UTF-8 でも Shift_JIS でもないため読み込めません。" +
      "UTF-8 か Shift_JIS で保存し直してください。",
  });
});

test("バイト列以外を渡すとTypeErrorになる", () => {
  const notBytes = "字幕";

  const act = () => decodeText(notBytes);

  assert.throws(act, TypeError);
});
