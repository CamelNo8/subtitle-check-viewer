import { parseSubtitleMarkup } from "./subtitle-markup.js";

/**
 * 字幕欄に字幕を描く。重なっている字幕は上から順に並べる。
 * 文字は textContent で入れ、HTML として解釈させない。
 *
 * @param {HTMLElement} barElement - 字幕欄の要素。
 * @param {import("./srt-parser.js").Subtitle[]} subtitles - 表示する字幕（空なら空欄にする）。
 * @returns {void}
 */
export function renderSubtitleBar(barElement, subtitles) {
  const lineElements = subtitles.flatMap((subtitle) =>
    parseSubtitleMarkup(subtitle.text).map(createLineElement),
  );
  barElement.replaceChildren(...lineElements);
}

function createLineElement(segments) {
  const lineElement = document.createElement("div");
  lineElement.className = "subtitle-line";
  for (const { text, color } of segments) {
    const span = document.createElement("span");
    span.textContent = text;
    if (color !== null) {
      span.style.color = color;
    }
    lineElement.append(span);
  }
  return lineElement;
}
