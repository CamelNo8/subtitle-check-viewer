import { extractVideoId } from "./youtube-url.js";
import { describePlayerError } from "./player-error-message.js";
import { getCurrentTimeMs, seekToMs, showVideo } from "./youtube-player.js";
import { decodeUtf8 } from "./utf8-decoder.js";
import { parseSrt } from "./srt-parser.js";
import { pickSrtFile } from "./srt-file-picker.js";
import { findActiveSubtitles } from "./active-subtitles.js";
import { renderSubtitleBar } from "./subtitle-bar.js";
import {
  fitTextareaHeight,
  highlightSubtitleRows,
  markReviewedRow,
  renderSubtitleList,
} from "./subtitle-list.js";
import { countReviewedSubtitles, isReviewed, updateReview } from "./reviews.js";
import { calculateScrollTop } from "./scroll-position.js";
import { buildReviewCsv, makeReviewCsvFileName, restoreReviews } from "./review-csv.js";
import { downloadTextFile } from "./file-download.js";

const PLAYER_ELEMENT_ID = "player";
const NO_VIDEO_MESSAGE = "先に YouTube の URL を貼り付けてください。";
const CSV_NOT_UTF8_MESSAGE =
  "文字コードが UTF-8 ではないため読み込めません。" +
  "Excel で上書き保存した CSV は読めないので、アプリで書き出した CSV をそのまま選んでください。";
const CSV_FILE_NAME_PROMPT = "ファイル名を入力してください（後ろに _check.csv が付きます）";
const INITIAL_CSV_NAME = "name";
const CSV_MIME_TYPE = "text/csv";
// 選択欄は一旦取り外し、日本の放送で一般的な 29.97fps ドロップフレームに固定する
const TIMECODE_SETTING = { frameRate: "29.97", isDropFrame: true };

const videoForm = document.getElementById("video-form");
const videoUrlInput = document.getElementById("video-url");
const messageArea = document.getElementById("message");
const srtFileInput = document.getElementById("srt-file");
const srtDropZone = document.getElementById("srt-drop-zone");
// 字幕を表示する右側の欄全体でドラッグを受け付ける（点線の枠の外の結果表示の上でもよい）
const subtitlePanel = document.getElementById("subtitle-panel");
const srtStatus = document.getElementById("srt-status");
const srtWarningList = document.getElementById("srt-warnings");
const subtitleBar = document.getElementById("subtitle-bar");
const subtitleListSection = document.getElementById("subtitle-list-section");
const subtitleListScroll = document.getElementById("subtitle-list-scroll");
const subtitleListBody = document.getElementById("subtitle-list-body");
const followPlaybackCheckbox = document.getElementById("follow-playback");
const csvExportButton = document.getElementById("csv-export-button");
const csvImportButton = document.getElementById("csv-import-button");
const csvFileInput = document.getElementById("csv-file");

// 読み込んだ SRT の字幕と、字幕欄に今出している字幕
let loadedSubtitles = [];
let shownSubtitles = [];
// 字幕番号 → その字幕のコメント・修正案（reviews.js の形）
let reviews = {};
// 最後に CSV を書き出した（または読み込んだ・SRT を読み込んだ）後に、コメント・修正案を変えたか
let hasUnexportedChanges = false;
// 書き出すときの名前の最初の値。2回目からは前回入力した名前にする
let csvName = INITIAL_CSV_NAME;

function showMessage(text) {
  messageArea.textContent = text;
}

async function loadVideo(url) {
  showMessage("");
  let videoId;
  try {
    videoId = extractVideoId(url);
  } catch (error) {
    // URL が不正なときは今の動画を残したまま、直し方を表示する
    showMessage(error.message);
    return;
  }
  try {
    await showVideo(PLAYER_ELEMENT_ID, videoId, (code) => showMessage(describePlayerError(code)));
  } catch (error) {
    showMessage(error.message);
  }
}

function showSrtResult(text, warnings, isError) {
  srtStatus.textContent = text;
  srtStatus.classList.toggle("is-error", isError);
  srtWarningList.replaceChildren(
    ...warnings.map((warning) => {
      const item = document.createElement("li");
      item.textContent = warning;
      return item;
    }),
  );
}

function hasUnexportedReviews() {
  return hasUnexportedChanges && countReviewedSubtitles(reviews) > 0;
}

// 書き出していないコメント・修正案が消える操作の前に確認する。なければ確認せず進める
function confirmDiscardReviews(question) {
  if (!hasUnexportedReviews()) {
    return true;
  }
  return window.confirm(
    `書き出していないコメント・修正案があります（${countReviewedSubtitles(reviews)}件）。${question}`,
  );
}

async function loadSubtitleFile(file) {
  let parsed;
  try {
    parsed = parseSrt(decodeUtf8(await file.arrayBuffer()));
  } catch (error) {
    // 読み込みに失敗しただけでコメントが消えないよう、今の一覧とコメントは残す
    showSrtResult(`${file.name}: ${error.message}`, [], true);
    return;
  }
  if (!confirmDiscardReviews("新しい SRT に切り替えると消えます。切り替えますか？")) {
    showSrtResult(
      `${file.name} の読み込みを取りやめました（今の一覧とコメントはそのままです）`,
      [],
      false,
    );
    return;
  }
  const { subtitles, warnings } = parsed;
  showSubtitleList(subtitles);
  showSrtResult(`${file.name}: ${subtitles.length}件の字幕を読み込みました`, warnings, false);
}

// 字幕を保持して一覧を作り直す（コメント・修正案は空に戻る）
function showSubtitleList(subtitles) {
  loadedSubtitles = subtitles;
  const hasSubtitles = subtitles.length > 0;
  subtitleListSection.hidden = !hasSubtitles;
  subtitlePanel.classList.toggle("has-subtitles", hasSubtitles);
  showReviews({});
}

// コメント・修正案を差し替えて一覧を作り直す。差し替えた内容は「書き出し済み」とみなす
function showReviews(newReviews) {
  reviews = newReviews;
  hasUnexportedChanges = false;
  renderSubtitleList(subtitleListBody, loadedSubtitles, reviews, TIMECODE_SETTING);
  // 行を作り直すと強調が消えるので、次の描画で今の字幕を強調し直す
  shownSubtitles = [];
}

function exportReviewCsv() {
  const name = window.prompt(CSV_FILE_NAME_PROMPT, csvName);
  // キャンセルされたら何もしない
  if (name === null) {
    return;
  }
  let fileName;
  try {
    fileName = makeReviewCsvFileName(name);
  } catch (error) {
    showSrtResult(`書き出せませんでした: ${error.message}`, [], true);
    return;
  }
  csvName = name.trim();
  downloadTextFile(
    fileName,
    buildReviewCsv(loadedSubtitles, reviews, TIMECODE_SETTING),
    CSV_MIME_TYPE,
  );
  hasUnexportedChanges = false;
  showSrtResult(
    `${fileName} を書き出しました（コメント・修正案 ${countReviewedSubtitles(reviews)}件）`,
    [],
    false,
  );
}

async function loadReviewFile(file) {
  let csvText;
  try {
    csvText = decodeUtf8(await file.arrayBuffer());
  } catch {
    // decodeUtf8 のメッセージは SRT 向けなので、CSV 向けの説明に置き換える
    showSrtResult(`${file.name}: ${CSV_NOT_UTF8_MESSAGE}`, [], true);
    return;
  }
  let restored;
  try {
    restored = restoreReviews(csvText, loadedSubtitles);
  } catch (error) {
    // 読み込みに失敗しただけでコメントが消えないよう、今のコメントは残す
    showSrtResult(`${file.name}: ${error.message}`, [], true);
    return;
  }
  if (!confirmDiscardReviews("CSV の内容に置き換えますか？")) {
    showSrtResult(
      `${file.name} の読み込みを取りやめました（今のコメントはそのままです）`,
      [],
      false,
    );
    return;
  }
  showReviews(restored.reviews);
  showSrtResult(
    `${file.name}: コメント・修正案 ${countReviewedSubtitles(reviews)}件を読み込みました`,
    restored.warnings,
    false,
  );
}

function isSameSubtitles(left, right) {
  return left.length === right.length && left.every((subtitle, index) => subtitle === right[index]);
}

// 一覧の上の見出し行（固定表示）に隠れない範囲で、行が見えるようにスクロールする
function scrollRowIntoView(row) {
  const headerHeight = subtitleListScroll.querySelector("thead").offsetHeight;
  const rowTop =
    row.getBoundingClientRect().top -
    subtitleListScroll.getBoundingClientRect().top +
    subtitleListScroll.scrollTop;
  const scrollTop = calculateScrollTop(
    { top: rowTop - headerHeight, height: row.offsetHeight },
    {
      scrollTop: subtitleListScroll.scrollTop,
      height: subtitleListScroll.clientHeight - headerHeight,
    },
  );
  if (scrollTop !== null) {
    subtitleListScroll.scrollTop = scrollTop;
  }
}

function showActiveSubtitles(activeSubtitles) {
  renderSubtitleBar(subtitleBar, activeSubtitles);
  const firstActiveRow = highlightSubtitleRows(subtitleListBody, loadedSubtitles, activeSubtitles);
  if (followPlaybackCheckbox.checked && firstActiveRow !== null && !isTypingReview()) {
    scrollRowIntoView(firstActiveRow);
  }
}

// 入力欄に書いている途中は、一覧が勝手に動かないよう追従のスクロールを休む
function isTypingReview() {
  return (
    document.activeElement instanceof HTMLTextAreaElement &&
    subtitleListBody.contains(document.activeElement)
  );
}

// 描画のたびに再生時刻を読み、表示すべき字幕が変わったときだけ字幕欄と一覧を更新する
function updateActiveSubtitles() {
  const timeMs = getCurrentTimeMs();
  const activeSubtitles = timeMs === null ? [] : findActiveSubtitles(loadedSubtitles, timeMs);
  if (!isSameSubtitles(activeSubtitles, shownSubtitles)) {
    showActiveSubtitles(activeSubtitles);
    shownSubtitles = activeSubtitles;
  }
  requestAnimationFrame(updateActiveSubtitles);
}

function handleSrtFiles(files) {
  let file;
  try {
    file = pickSrtFile(files);
  } catch (error) {
    showSrtResult(error.message, [], true);
    return;
  }
  loadSubtitleFile(file);
}

// 入力欄が1つだけの form は、ボタンがなくても Enter で submit される
videoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadVideo(videoUrlInput.value);
});

// 貼り付けた瞬間は入力欄の値がまだ変わっていないので、貼り付けた文字そのものを読み込む
videoUrlInput.addEventListener("paste", (event) => {
  loadVideo(event.clipboardData.getData("text"));
});

srtFileInput.addEventListener("change", () => {
  const files = Array.from(srtFileInput.files);
  // 選択画面をキャンセルしたときは何もしない
  if (files.length === 0) {
    return;
  }
  handleSrtFiles(files);
  // 同じファイルを選び直しても change が起きるように空にしておく
  srtFileInput.value = "";
});

// dragover の既定の動作を止めないと drop が起きない
subtitlePanel.addEventListener("dragover", (event) => {
  event.preventDefault();
  srtDropZone.classList.add("is-dragover");
});

// 欄の中の子要素へ移っただけのときは、枠の色を戻さない
subtitlePanel.addEventListener("dragleave", (event) => {
  if (subtitlePanel.contains(event.relatedTarget)) {
    return;
  }
  srtDropZone.classList.remove("is-dragover");
});

subtitlePanel.addEventListener("drop", (event) => {
  event.preventDefault();
  srtDropZone.classList.remove("is-dragover");
  handleSrtFiles(Array.from(event.dataTransfer.files));
});

// 枠の外に落としたとき、ブラウザがファイルを開いて画面が切り替わらないようにする
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());

// 行のどこをクリックしても、その字幕の開始時刻へ移動する
subtitleListBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-index]");
  // 入力欄とその見出しのクリックでは、書くたびに動画が飛ばないよう移動しない
  if (row === null || event.target.closest(".review-fields") !== null) {
    return;
  }
  const subtitle = loadedSubtitles[Number(row.dataset.index)];
  if (!seekToMs(subtitle.startMs)) {
    showMessage(NO_VIDEO_MESSAGE);
  }
});

subtitleListBody.addEventListener("input", (event) => {
  const textarea = event.target;
  if (!(textarea instanceof HTMLTextAreaElement)) {
    return;
  }
  const row = textarea.closest("tr[data-index]");
  const { number } = loadedSubtitles[Number(row.dataset.index)];
  reviews = updateReview(reviews, number, textarea.dataset.field, textarea.value);
  hasUnexportedChanges = true;
  markReviewedRow(row, isReviewed(reviews[number]));
  fitTextareaHeight(textarea);
});

// 書き出していないコメント・修正案があるときにページを閉じる・再読み込みすると、
// ブラウザ標準の確認を出す
window.addEventListener("beforeunload", (event) => {
  if (hasUnexportedReviews()) {
    event.preventDefault();
  }
});

csvExportButton.addEventListener("click", exportReviewCsv);

// 見た目のそろったボタンから、隠してあるファイル選択を開く
csvImportButton.addEventListener("click", () => csvFileInput.click());

csvFileInput.addEventListener("change", () => {
  const [file] = csvFileInput.files;
  // 選択画面をキャンセルしたときは何もしない
  if (file === undefined) {
    return;
  }
  loadReviewFile(file);
  // 同じファイルを選び直しても change が起きるように空にしておく
  csvFileInput.value = "";
});

// 追従を ON にしたら、すぐ今の行を見える位置に出す
followPlaybackCheckbox.addEventListener("change", () => {
  const firstActiveRow = subtitleListBody.querySelector("tr.is-active");
  if (followPlaybackCheckbox.checked && firstActiveRow !== null) {
    scrollRowIntoView(firstActiveRow);
  }
});

requestAnimationFrame(updateActiveSubtitles);
