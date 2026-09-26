import { test } from "node:test";
import assert from "node:assert/strict";

import { decodeUtf8 } from "../src/utf8-decoder.js";

const UTF8_BOM = [0xef, 0xbb, 0xbf];
// Shift_JIS で「字幕」を表すバイト列
const SHIFT_JIS_JIMAKU = [0x8e, 0x9a, 0x96, 0x8b];

// 正常系

test("UTF-8の日本語はそのままの文字列になる", () => {
  const bytes = new TextEncoder().encode("字幕");

  const text = decodeUtf8(bytes);

  assert.equal(text, "字幕");
});

test("BOM付きのUTF-8はBOMを除いた文字列になる", () => {
  const bytes = new Uint8Array([...UTF8_BOM, ...new TextEncoder().encode("1")]);

  const text = decodeUtf8(bytes);

  assert.equal(text, "1");
});

test("ArrayBufferを渡しても文字列になる", () => {
  const buffer = new TextEncoder().encode("字幕").buffer;

  const text = decodeUtf8(buffer);

  assert.equal(text, "字幕");
});

// 境界値

test("0バイトを渡すと空文字になる", () => {
  const bytes = new Uint8Array([]);

  const text = decodeUtf8(bytes);

  assert.equal(text, "");
});

// 異常系

test("Shift_JISの日本語を渡すとUTF-8ではないエラーになる", () => {
  const bytes = new Uint8Array(SHIFT_JIS_JIMAKU);

  const act = () => decodeUtf8(bytes);

  assert.throws(act, {
    message:
      "文字コードが UTF-8 ではないため読み込めません。字幕ファイルを UTF-8 で保存し直してください。",
  });
});

test("バイト列以外を渡すとTypeErrorになる", () => {
  const notBytes = "字幕";

  const act = () => decodeUtf8(notBytes);

  assert.throws(act, TypeError);
});
