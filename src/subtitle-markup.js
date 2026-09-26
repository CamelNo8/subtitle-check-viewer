// "<" の直後が英字のものだけをタグとみなす（"3 < 5" の "<" は文字として残す）
const TAG_PATTERN = /<(\/?)([a-zA-Z]+)([^>]*)>/g;
const FONT_TAG_NAME = "font";
const COLOR_ATTRIBUTE_PATTERN = /color\s*=\s*["']?(#[0-9a-fA-F]{6})["']?/;

/**
 * @typedef {object} Segment
 * @property {string} text - 文字。
 * @property {string | null} color - "#RRGGBB" の色。指定なし（白で表示）は null。
 */

/**
 * 字幕の本文を行ごとに分け、各行を色つきの文字のかたまりの配列にする。
 * <font color="#RRGGBB"> だけを色として扱い、それ以外のタグは消す。
 *
 * @param {string} text - 字幕の本文（タグを含んでよい）。
 * @returns {Segment[][]} 行の配列。各行は文字のかたまりの配列。空文字なら空の配列。
 * @throws {TypeError} text が文字列でない場合。
 */
export function parseSubtitleMarkup(text) {
  if (typeof text !== "string") {
    throw new TypeError(`字幕の本文は文字列で渡してください（受け取った型: ${typeof text}）`);
  }
  if (text === "") {
    return [];
  }

  const lines = [[]];
  // 入れ子の <font> に備えて色を積み重ねる。一番上が今の色
  const colorStack = [];
  let position = 0;
  for (const match of text.matchAll(TAG_PATTERN)) {
    appendText(lines, text.slice(position, match.index), colorStack.at(-1) ?? null);
    updateColorStack(colorStack, match);
    position = match.index + match[0].length;
  }
  appendText(lines, text.slice(position), colorStack.at(-1) ?? null);
  return lines;
}

function updateColorStack(colorStack, [, closingSlash, tagName, attributes]) {
  if (tagName.toLowerCase() !== FONT_TAG_NAME) {
    return;
  }
  if (closingSlash === "") {
    colorStack.push(COLOR_ATTRIBUTE_PATTERN.exec(attributes)?.[1] ?? null);
    return;
  }
  // 開きタグのない </font> は何もしない（空の配列の pop は何も起きない）
  colorStack.pop();
}

// 改行ごとに行を分けながら、今の行の最後に文字を足す
function appendText(lines, text, color) {
  text.split("\n").forEach((part, index) => {
    if (index > 0) {
      lines.push([]);
    }
    appendSegment(lines.at(-1), part, color);
  });
}

// タグを消した結果、同じ色のかたまりが隣り合ったら1つにまとめる
function appendSegment(line, text, color) {
  if (text === "") {
    return;
  }
  const last = line.at(-1);
  if (last !== undefined && last.color === color) {
    last.text += text;
    return;
  }
  line.push({ text, color });
}
