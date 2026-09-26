import { parseSubtitleMarkup } from "./subtitle-markup.js";
import { formatSrtTime } from "./srt-time-format.js";
import { isReviewed } from "./reviews.js";

const ACTIVE_ROW_CLASS = "is-active";
const REVIEWED_ROW_CLASS = "is-reviewed";
const EMPTY_TEXT_LABEL = "（本文なし）";
const REVIEW_MARK = "●";
// 各行に置く入力欄。name は reviews.js の欄の名前と同じにする
const REVIEW_FIELD_LABELS = [
  { name: "comment", label: "コメント" },
  { name: "suggestion", label: "修正案" },
];

/**
 * 字幕一覧の行を作り直す。各行の data-index は subtitles の位置を表す。
 * 文字は textContent で入れ、HTML として解釈させない。
 * 入力欄の高さを測るため、tbody が画面に表示されている状態で呼ぶ。
 *
 * @param {HTMLTableSectionElement} tableBody - 一覧の tbody 要素。
 * @param {import("./srt-parser.js").Subtitle[]} subtitles - 表示する字幕の一覧。
 * @param {import("./reviews.js").Reviews} reviews - 入力欄に入れておくコメント・修正案。
 * @returns {void}
 */
export function renderSubtitleList(tableBody, subtitles, reviews) {
  tableBody.replaceChildren(
    ...subtitles.map((subtitle, index) => createRow(subtitle, index, reviews[subtitle.number])),
  );
  for (const textarea of tableBody.querySelectorAll("textarea")) {
    if (textarea.value !== "") {
      fitTextareaHeight(textarea);
    }
  }
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

/**
 * コメント・修正案が書かれている行に印を付ける（書かれていなければ外す）。
 *
 * @param {HTMLTableRowElement} row - 一覧の行。
 * @param {boolean} reviewed - 書かれているか。
 * @returns {void}
 */
export function markReviewedRow(row, reviewed) {
  row.classList.toggle(REVIEWED_ROW_CLASS, reviewed);
}

/**
 * 入力欄の高さを、書かれている行数に合わせる。
 *
 * @param {HTMLTextAreaElement} textarea - 入力欄。
 * @returns {void}
 */
export function fitTextareaHeight(textarea) {
  // 一度高さを戻してから測らないと、文字を消したときに縮まない
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function createRow(subtitle, index, review) {
  const row = document.createElement("tr");
  row.dataset.index = String(index);
  markReviewedRow(row, isReviewed(review));

  const numberCell = document.createElement("td");
  const reviewMark = document.createElement("span");
  reviewMark.className = "review-mark";
  reviewMark.textContent = REVIEW_MARK;
  reviewMark.title = "コメント・修正案あり";
  numberCell.append(String(subtitle.number), reviewMark);

  // キーボードでも移動できるよう、開始時刻をボタンにする
  const timeCell = document.createElement("td");
  const jumpButton = document.createElement("button");
  jumpButton.type = "button";
  jumpButton.className = "jump-button";
  jumpButton.textContent = formatSrtTime(subtitle.startMs);
  timeCell.append(jumpButton);

  const textCell = document.createElement("td");
  const textElement = document.createElement("div");
  textElement.className = "subtitle-text";
  const plainText = toPlainText(subtitle.text);
  textElement.textContent = plainText === "" ? EMPTY_TEXT_LABEL : plainText;
  textElement.classList.toggle("is-empty", plainText === "");
  textCell.append(textElement, createReviewFields(review));

  row.append(numberCell, timeCell, textCell);
  return row;
}

function createReviewFields(review) {
  const fields = document.createElement("div");
  fields.className = "review-fields";
  for (const { name, label } of REVIEW_FIELD_LABELS) {
    const labelElement = document.createElement("label");
    const caption = document.createElement("span");
    caption.textContent = label;
    const textarea = document.createElement("textarea");
    textarea.dataset.field = name;
    textarea.rows = 1;
    textarea.value = review?.[name] ?? "";
    labelElement.append(caption, textarea);
    fields.append(labelElement);
  }
  return fields;
}

// 一覧は白い背景なので、色は付けずにタグを消した文字だけにする
function toPlainText(text) {
  return parseSubtitleMarkup(text)
    .map((segments) => segments.map((segment) => segment.text).join(""))
    .join("\n");
}
