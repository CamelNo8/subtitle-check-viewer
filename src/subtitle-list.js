import { parseSubtitleMarkup } from "./subtitle-markup.js";
import { formatSrtTime } from "./srt-time-format.js";

const ACTIVE_ROW_CLASS = "is-active";
const EMPTY_TEXT_LABEL = "（本文なし）";

/**
 * 字幕一覧の行を作り直す。各行の data-index は subtitles の位置を表す。
 * 文字は textContent で入れ、HTML として解釈させない。
 *
 * @param {HTMLTableSectionElement} tableBody - 一覧の tbody 要素。
 * @param {import("./srt-parser.js").Subtitle[]} subtitles - 表示する字幕の一覧。
 * @returns {void}
 */
export function renderSubtitleList(tableBody, subtitles) {
  tableBody.replaceChildren(...subtitles.map(createRow));
}

/**
 * 今表示している字幕の行を強調し、それ以外の行の強調を外す。
 *
 * @param {HTMLTableSectionElement} tableBody - 一覧の tbody 要素。
 * @param {import("./srt-parser.js").Subtitle[]} subtitles - 一覧を作ったときの字幕の一覧。
 * @param {import("./srt-parser.js").Subtitle[]} activeSubtitles - 今表示している字幕。
 * @returns {HTMLTableRowElement | null} 強調した最初の行。強調した行がなければ null。
 */
export function highlightSubtitleRows(tableBody, subtitles, activeSubtitles) {
  const activeSet = new Set(activeSubtitles);
  let firstActiveRow = null;
  for (const row of tableBody.rows) {
    const isActive = activeSet.has(subtitles[Number(row.dataset.index)]);
    row.classList.toggle(ACTIVE_ROW_CLASS, isActive);
    if (isActive && firstActiveRow === null) {
      firstActiveRow = row;
    }
  }
  return firstActiveRow;
}

function createRow(subtitle, index) {
  const row = document.createElement("tr");
  row.dataset.index = String(index);

  const numberCell = document.createElement("td");
  numberCell.textContent = String(subtitle.number);

  // キーボードでも移動できるよう、開始時刻をボタンにする
  const timeCell = document.createElement("td");
  const jumpButton = document.createElement("button");
  jumpButton.type = "button";
  jumpButton.className = "jump-button";
  jumpButton.textContent = formatSrtTime(subtitle.startMs);
  timeCell.append(jumpButton);

  const textCell = document.createElement("td");
  const plainText = toPlainText(subtitle.text);
  textCell.textContent = plainText === "" ? EMPTY_TEXT_LABEL : plainText;
  textCell.classList.toggle("is-empty", plainText === "");

  row.append(numberCell, timeCell, textCell);
  return row;
}

// 一覧は白い背景なので、色は付けずにタグを消した文字だけにする
function toPlainText(text) {
  return parseSubtitleMarkup(text)
    .map((segments) => segments.map((segment) => segment.text).join(""))
    .join("\n");
}
