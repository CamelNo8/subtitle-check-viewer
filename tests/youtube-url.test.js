import { test } from "node:test";
import assert from "node:assert/strict";

import { extractVideoId } from "../src/youtube-url.js";

const VIDEO_ID = "dQw4w9WgXcQ";

// 正常系

test("watchのURLから動画IDが返る", () => {
  const url = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

  const videoId = extractVideoId(url);

  assert.equal(videoId, VIDEO_ID);
});

test("watchのURLに再生位置やプレイリストが付いていても動画IDだけが返る", () => {
  const url = `https://www.youtube.com/watch?v=${VIDEO_ID}&t=30s&list=PLxxx`;

  const videoId = extractVideoId(url);

  assert.equal(videoId, VIDEO_ID);
});

test("スマホ版のwatchのURLから動画IDが返る", () => {
  const url = `https://m.youtube.com/watch?v=${VIDEO_ID}`;

  const videoId = extractVideoId(url);

  assert.equal(videoId, VIDEO_ID);
});

test("youtu.beの短縮URLから動画IDが返る", () => {
  const url = `https://youtu.be/${VIDEO_ID}?si=abc`;

  const videoId = extractVideoId(url);

  assert.equal(videoId, VIDEO_ID);
});

test("embedのURLから動画IDが返る", () => {
  const url = `https://www.youtube.com/embed/${VIDEO_ID}`;

  const videoId = extractVideoId(url);

  assert.equal(videoId, VIDEO_ID);
});

test("shortsのURLから動画IDが返る", () => {
  const url = `https://www.youtube.com/shorts/${VIDEO_ID}`;

  const videoId = extractVideoId(url);

  assert.equal(videoId, VIDEO_ID);
});

test("前後に空白があるURLから動画IDが返る", () => {
  const url = `  https://www.youtube.com/watch?v=${VIDEO_ID}\n`;

  const videoId = extractVideoId(url);

  assert.equal(videoId, VIDEO_ID);
});

// 境界値

test("空文字を渡すと空欄のエラーになる", () => {
  const url = "";

  const act = () => extractVideoId(url);

  assert.throws(act, { message: "YouTubeのURLを入力してください。" });
});

test("空白だけを渡すと空欄のエラーになる", () => {
  const url = "   ";

  const act = () => extractVideoId(url);

  assert.throws(act, { message: "YouTubeのURLを入力してください。" });
});

test("動画IDが10文字だと動画IDの形がおかしいエラーになる", () => {
  const url = "https://www.youtube.com/watch?v=dQw4w9WgXc";

  const act = () => extractVideoId(url);

  assert.throws(act, /URLの動画ID「dQw4w9WgXc」が正しくありません/);
});

test("動画IDが12文字だと動画IDの形がおかしいエラーになる", () => {
  const url = "https://youtu.be/dQw4w9WgXcQQ";

  const act = () => extractVideoId(url);

  assert.throws(act, /URLの動画ID「dQw4w9WgXcQQ」が正しくありません/);
});

// 異常系

test("動画IDに使えない記号が入っていると動画IDの形がおかしいエラーになる", () => {
  const url = "https://www.youtube.com/watch?v=dQw4w9WgXc!";

  const act = () => extractVideoId(url);

  assert.throws(act, /URLの動画ID「dQw4w9WgXc!」が正しくありません/);
});

test("URLではない文字列を渡すとURLの形になっていないエラーになる", () => {
  const url = "abc";

  const act = () => extractVideoId(url);

  assert.throws(act, /URLとして読み取れません: 「abc」/);
});

test("YouTube以外のURLを渡すとYouTube以外のエラーになる", () => {
  const url = "https://vimeo.com/123";

  const act = () => extractVideoId(url);

  assert.throws(act, /YouTube以外のURLです: 「https:\/\/vimeo\.com\/123」/);
});

test("v=が無いwatchのURLを渡すと動画を指していないエラーになる", () => {
  const url = "https://www.youtube.com/watch";

  const act = () => extractVideoId(url);

  assert.throws(act, /動画のURLではありません: 「https:\/\/www\.youtube\.com\/watch」/);
});

test("チャンネルページのURLを渡すと動画を指していないエラーになる", () => {
  const url = "https://www.youtube.com/@channel";

  const act = () => extractVideoId(url);

  assert.throws(act, /動画のURLではありません: 「https:\/\/www\.youtube\.com\/@channel」/);
});

test("文字列以外を渡すとTypeErrorになる", () => {
  const url = null;

  const act = () => extractVideoId(url);

  assert.throws(act, TypeError);
});
