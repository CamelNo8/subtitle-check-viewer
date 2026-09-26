const BOM = "﻿";
const NUMBER_PATTERN = /^\d+$/;
// 分・秒は 00〜59 だけを受け付ける
const TIME_PART = String.raw`(\d{2}):([0-5]\d):([0-5]\d),(\d{3})`;
const TIME_LINE_PATTERN = new RegExp(`^${TIME_PART} --> ${TIME_PART}$`);
const TIME_LINE_EXAMPLE = "00:00:01,000 --> 00:00:03,500";
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * @typedef {object} Subtitle
 * @property {number} number - SRT の字幕番号。
 * @property {number} startMs - 開始時刻（ミリ秒）。
 * @property {number} endMs - 終了時刻（ミリ秒）。
 * @property {string} text - 本文。複数行は "\n" でつなぐ。本文なしは空文字。
 */

/**
 * SRT の文字列を字幕の一覧にする。
 *
 * @param {string} text - SRT ファイルの中身。
 * @returns {{ subtitles: Subtitle[], warnings: string[] }} 字幕の一覧（ファイル順）と警告メッセージ。
 * @throws {TypeError} text が文字列でない場合。
 * @throws {Error} 字幕がない、番号・時刻が読めない、番号が重複している場合。
 */
export function parseSrt(text) {
  if (typeof text !== "string") {
    throw new TypeError(`SRT の中身は文字列で渡してください（受け取った型: ${typeof text}）`);
  }
  const blocks = splitIntoBlocks(text);
  if (blocks.length === 0) {
    throw new Error("字幕が1件もありません。SRT ファイルの中身を確認してください。");
  }

  const subtitles = blocks.map((lines, index) => parseBlock(lines, index + 1));
  throwIfDuplicateNumber(subtitles);
  return { subtitles, warnings: subtitles.flatMap(findTimingWarnings) };
}

// 空行（空白だけの行を含む）で区切り、字幕1件分ずつの行の配列にする
function splitIntoBlocks(text) {
  const normalized = text.replace(BOM, "").replace(/\r\n?/g, "\n");
  return normalized
    .split(/\n\s*\n/)
    .filter((block) => block.trim() !== "")
    .map((block) => block.replace(/^\n+|\n+$/g, "").split("\n"));
}

function parseBlock(lines, position) {
  const [numberLine, timeLine = "", ...textLines] = lines;
  const numberText = numberLine.trim();
  if (!NUMBER_PATTERN.test(numberText)) {
    throw new Error(`${position}番目の字幕の番号が読めません:「${numberLine}」。`);
  }
  const number = Number(numberText);

  const match = TIME_LINE_PATTERN.exec(timeLine.trim());
  if (match === null) {
    throw new Error(
      `${number}番の字幕の時刻が読めません:「${timeLine}」。` +
        `「${TIME_LINE_EXAMPLE}」の形に直してください。`,
    );
  }
  return {
    number,
    startMs: toMilliseconds(match.slice(1, 5)),
    endMs: toMilliseconds(match.slice(5, 9)),
    text: textLines.join("\n"),
  };
}

function toMilliseconds([hours, minutes, seconds, milliseconds]) {
  const totalMinutes = Number(hours) * MINUTES_PER_HOUR + Number(minutes);
  const totalSeconds = totalMinutes * SECONDS_PER_MINUTE + Number(seconds);
  return totalSeconds * MS_PER_SECOND + Number(milliseconds);
}

// CSV から再開するときに番号で字幕を探すため、重複は区別できずエラーにする
function throwIfDuplicateNumber(subtitles) {
  const seenNumbers = new Set();
  for (const { number } of subtitles) {
    if (seenNumbers.has(number)) {
      throw new Error(
        `字幕番号 ${number} が重複しています。SRT の番号が重ならないように直してください。`,
      );
    }
    seenNumbers.add(number);
  }
}

// 時刻の矛盾はチェックの対象そのものなので、止めずに警告として知らせる
function findTimingWarnings({ number, startMs, endMs }) {
  if (endMs < startMs) {
    return [`${number}番: 終了時刻が開始時刻より前です`];
  }
  if (endMs === startMs) {
    return [`${number}番: 表示時間が0秒です`];
  }
  return [];
}
