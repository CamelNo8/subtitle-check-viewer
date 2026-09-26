import { test } from "node:test";
import assert from "node:assert/strict";

import { calculateScrollTop } from "../src/scroll-position.js";

// 見えている範囲: 上端 100、高さ 300（= 100〜400 が見えている）
const VIEW = { scrollTop: 100, height: 300 };

// 正常系

test("行が見える範囲の中にあればnullが返る", () => {
  const row = { top: 150, height: 30 };

  const scrollTop = calculateScrollTop(row, VIEW);

  assert.equal(scrollTop, null);
});

test("行が見える範囲より下にあれば行の下端が見える範囲の下端に来る位置が返る", () => {
  const row = { top: 500, height: 30 };

  const scrollTop = calculateScrollTop(row, VIEW);

  assert.equal(scrollTop, 230);
});

test("行が見える範囲より上にあれば行の上端の位置が返る", () => {
  const row = { top: 40, height: 30 };

  const scrollTop = calculateScrollTop(row, VIEW);

  assert.equal(scrollTop, 40);
});

// 境界値

test("行の下端が見える範囲の下端ちょうどならnullが返る", () => {
  const row = { top: 370, height: 30 };

  const scrollTop = calculateScrollTop(row, VIEW);

  assert.equal(scrollTop, null);
});

test("行が見える範囲より高ければ行の上端の位置が返る", () => {
  const row = { top: 500, height: 400 };

  const scrollTop = calculateScrollTop(row, VIEW);

  assert.equal(scrollTop, 500);
});

// 異常系

test("数値でない値を含むとTypeErrorになる", () => {
  const row = { top: "150", height: 30 };

  const act = () => calculateScrollTop(row, VIEW);

  assert.throws(act, TypeError);
});
