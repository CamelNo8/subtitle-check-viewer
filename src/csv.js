const FIELD_SEPARATOR = ",";
const QUOTE = '"';
// Excel・Windows で普通に使われる行の区切り
const ROW_SEPARATOR = "\r\n";
// これらを含む欄は、囲まないと区切りと見分けがつかない
const CHARACTERS_NEEDING_QUOTES = /[",\r\n]/;

/**
 * 表（行×列の文字）を CSV の文字にする（RFC 4180）。BOM は付けない。
 * 「,」「"」改行を含む欄は「"」で囲み、中の「"」は「""」にする。
 *
 * @param {string[][]} rows - 表。各行は欄の文字の配列。
 * @returns {string} CSV の文字。各行の終わりに CRLF が付く。行が0件なら空文字。
 * @throws {TypeError} 欄が文字列でない場合。
 */
export function formatCsv(rows) {
  return rows.map((row) => row.map(formatField).join(FIELD_SEPARATOR) + ROW_SEPARATOR).join("");
}

/**
 * CSV の文字を表（行×列の文字）にする（RFC 4180）。行の区切りは CRLF・LF のどちらでもよい。
 * 最後の改行はあってもなくてもよい。
 *
 * @param {string} text - CSV の文字（BOM は取り除いておく）。
 * @returns {string[][]} 表。空文字なら空の配列。
 * @throws {TypeError} text が文字列でない場合。
 * @throws {Error} 「"」が閉じていない場合。
 */
export function parseCsv(text) {
  if (typeof text !== "string") {
    throw new TypeError(`CSV は文字列で渡してください（受け取った型: ${typeof text}）`);
  }
  const rows = [];
  let row = [];
  let field = "";
  let isInQuotes = false;
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (isInQuotes) {
      if (character !== QUOTE) {
        field += character;
      } else if (text[index + 1] === QUOTE) {
        field += QUOTE;
        index += 1;
      } else {
        isInQuotes = false;
      }
    } else if (character === QUOTE) {
      isInQuotes = true;
    } else if (character === FIELD_SEPARATOR) {
      row.push(field);
      field = "";
    } else if (character === "\r" || character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      // CRLF は1つの区切りとして読む
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      field += character;
    }
    index += 1;
  }
  if (isInQuotes) {
    throw new Error('CSV の形が崩れています（「"」が閉じていません）。');
  }
  // 最後に改行がないときは、最後の行がまだ表に入っていない
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function formatField(field) {
  if (typeof field !== "string") {
    throw new TypeError(`CSV の欄は文字列で渡してください（受け取った値: ${field}）`);
  }
  if (!CHARACTERS_NEEDING_QUOTES.test(field)) {
    return field;
  }
  return QUOTE + field.replaceAll(QUOTE, QUOTE + QUOTE) + QUOTE;
}
