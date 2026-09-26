import { formatCsv, parseCsv } from "./csv.js";
import { formatTimecode } from "./timecode.js";

// Excel が UTF-8 だと気づけるよう、先頭に付ける印
const BOM = "﻿";
const COLUMNS = {
  number: "番号",
  start: "開始時刻",
  end: "終了時刻",
  text: "字幕",
  comment: "コメント",
  suggestion: "修正案",
};
const HEADER = Object.values(COLUMNS);
// 読み込みでは時刻を使わない（番号で合わせる）ので、時刻の列はなくてもよい
const REQUIRED_COLUMNS = [COLUMNS.number, COLUMNS.text, COLUMNS.comment, COLUMNS.suggestion];
const NUMBER_PATTERN = /^\d+$/;
const FILE_NAME_SUFFIX = "_check.csv";
// Windows・macOS でファイル名に使えない文字
const INVALID_FILE_NAME_CHARACTERS = /[\\/:*?"<>|]/;

/**
 * 全字幕とコメント・修正案を、チェック結果の CSV（BOM 付き）にする。
 * コメントの有無にかかわらず、全字幕を SRT の順に1行ずつ出す。
 *
 * @param {import("./srt-parser.js").Subtitle[]} subtitles - 読み込んだ字幕の一覧。
 * @param {import("./reviews.js").Reviews} reviews - コメント・修正案の記録。
 * @param {import("./timecode.js").TimecodeSetting} setting - 時刻を書くフレームレートと方式。
 * @returns {string} BOM・見出し・字幕の行からなる CSV の文字。
 */
export function buildReviewCsv(subtitles, reviews, setting) {
  const rows = subtitles.map(({ number, startMs, endMs, text }) => [
    String(number),
    formatTimecode(startMs, setting),
    formatTimecode(endMs, setting),
    text,
    reviews[number]?.comment ?? "",
    reviews[number]?.suggestion ?? "",
  ]);
  return BOM + formatCsv([HEADER, ...rows]);
}

/**
 * チェック結果の CSV から、番号が一致する字幕のコメント・修正案を取り出す。
 *
 * @param {string} csvText - CSV の文字（BOM は取り除いておく）。
 * @param {import("./srt-parser.js").Subtitle[]} subtitles - 今読み込んでいる字幕の一覧。
 * @returns {{ reviews: import("./reviews.js").Reviews, warnings: string[] }}
 *   コメント・修正案の記録（両方空の字幕は入れない）と警告メッセージ。
 * @throws {Error} 見出し・列の数・番号がおかしい、同じ番号が2回ある、字幕の行がない場合。
 */
export function restoreReviews(csvText, subtitles) {
  const [header, ...rows] = parseCsv(csvText).filter((row) => !isBlankRow(row));
  if (rows.length === 0) {
    throw new Error("字幕の行がありません。");
  }
  const columnIndexes = findColumnIndexes(header);
  const subtitlesByNumber = new Map(subtitles.map((subtitle) => [subtitle.number, subtitle]));
  const seenNumbers = new Set();
  const reviews = {};
  const warnings = [];
  if (rows.length !== subtitles.length) {
    warnings.push(
      `字幕の数が合いません（SRT ${subtitles.length}件、CSV ${rows.length}件）。` +
        "SRT と CSV の組み合わせを確かめてください。",
    );
  }
  rows.forEach((row, index) => {
    // 見出しが1行目なので、字幕の行は2行目から（Excel の行番号と同じ）
    const lineNumber = index + 2;
    if (row.length !== header.length) {
      throw new Error(
        `${lineNumber}行目の列の数が見出しと合いません` +
          `（見出し ${header.length}列、${lineNumber}行目 ${row.length}列）。`,
      );
    }
    const number = readNumber(row[columnIndexes.number], lineNumber);
    if (seenNumbers.has(number)) {
      throw new Error(`番号 ${number} が2回あります。`);
    }
    seenNumbers.add(number);
    const comment = row[columnIndexes.comment];
    const suggestion = row[columnIndexes.suggestion];
    // コメントのない行は、組み合わせが違っても害がないので警告しない
    if (comment === "" && suggestion === "") {
      return;
    }
    const subtitle = subtitlesByNumber.get(number);
    if (subtitle === undefined) {
      warnings.push(`${number}番は SRT にないため、コメント・修正案を戻していません。`);
      return;
    }
    if (subtitle.text !== row[columnIndexes.text]) {
      warnings.push(`${number}番: 字幕の中身が SRT と違います。`);
    }
    reviews[number] = { comment, suggestion };
  });
  return { reviews, warnings };
}

/**
 * 入力された名前から、書き出す CSV のファイル名を作る。
 *
 * @param {string} name - 利用者が入力した名前（前後の空白は取り除く）。
 * @returns {string} 「名前_check.csv」。
 * @throws {TypeError} name が文字列でない場合。
 * @throws {Error} 名前が空、またはファイル名に使えない文字を含む場合。
 */
export function makeReviewCsvFileName(name) {
  if (typeof name !== "string") {
    throw new TypeError(`名前は文字列で渡してください（受け取った型: ${typeof name}）`);
  }
  const trimmedName = name.trim();
  if (trimmedName === "") {
    throw new Error("ファイル名を入力してください。");
  }
  const invalidCharacter = trimmedName.match(INVALID_FILE_NAME_CHARACTERS);
  if (invalidCharacter !== null) {
    throw new Error(
      `ファイル名に使えない文字が入っています:「${invalidCharacter[0]}」` +
        '（\\ / : * ? " < > | は使えません）。',
    );
  }
  return trimmedName + FILE_NAME_SUFFIX;
}

function isBlankRow(row) {
  return row.length === 1 && row[0] === "";
}

function findColumnIndexes(header) {
  const missingColumn = REQUIRED_COLUMNS.find((column) => !header.includes(column));
  if (missingColumn !== undefined) {
    throw new Error(
      `このアプリで書き出した CSV ではないようです（見出しに「${missingColumn}」がありません）。`,
    );
  }
  return {
    number: header.indexOf(COLUMNS.number),
    text: header.indexOf(COLUMNS.text),
    comment: header.indexOf(COLUMNS.comment),
    suggestion: header.indexOf(COLUMNS.suggestion),
  };
}

function readNumber(numberText, lineNumber) {
  if (!NUMBER_PATTERN.test(numberText)) {
    throw new Error(`${lineNumber}行目の番号が読めません:「${numberText}」。`);
  }
  return Number(numberText);
}
