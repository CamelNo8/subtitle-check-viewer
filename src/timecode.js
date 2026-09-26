const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
// ドロップフレームでも、10分ごとの頭は番号を飛ばさない
const MINUTES_PER_DROP_CYCLE = 10;

// 29.97 などは本当は 30000/1001 fps なので、分数のまま計算する。
// framesPerSecond はタイムコードの1秒を何フレームと数えるか、droppedFrames は毎分飛ばす番号の数
const FRAME_RATE_SPECS = {
  29.97: { numerator: 30000, denominator: 1001, framesPerSecond: 30, droppedFrames: 2 },
  30: { numerator: 30, denominator: 1, framesPerSecond: 30, droppedFrames: 0 },
  23.976: { numerator: 24000, denominator: 1001, framesPerSecond: 24, droppedFrames: 0 },
  24: { numerator: 24, denominator: 1, framesPerSecond: 24, droppedFrames: 0 },
  59.94: { numerator: 60000, denominator: 1001, framesPerSecond: 60, droppedFrames: 4 },
};

/** 画面で選べるフレームレート（最初が初期値）。 */
export const FRAME_RATES = ["29.97", "30", "23.976", "24", "59.94"];

/**
 * @typedef {object} TimecodeSetting
 * @property {string} frameRate - FRAME_RATES のどれか。
 * @property {boolean} isDropFrame - ドロップフレームで数えるか。
 */

/**
 * そのフレームレートでドロップフレームを使えるかを返す。
 *
 * @param {string} frameRate - FRAME_RATES のどれか。
 * @returns {boolean} 29.97・59.94 なら true。
 */
export function supportsDropFrame(frameRate) {
  return (FRAME_RATE_SPECS[frameRate]?.droppedFrames ?? 0) > 0;
}

/**
 * ミリ秒を、一番近いフレームに丸めたタイムコードにする。
 * ノンドロップは "00:01:00:00"、ドロップは最後の区切りだけ「;」で "00:01:00;02"。
 *
 * @param {number} ms - 時刻（0以上の整数のミリ秒）。
 * @param {TimecodeSetting} setting - フレームレートと方式。
 * @returns {string} "時:分:秒:フレーム" のタイムコード。
 * @throws {TypeError} ms が整数でない場合。
 * @throws {RangeError} ms が負の場合。
 * @throws {Error} 対応していないフレームレート、またはドロップを使えないフレームレートの場合。
 */
export function formatTimecode(ms, { frameRate, isDropFrame }) {
  if (!Number.isInteger(ms)) {
    throw new TypeError(`時刻は整数のミリ秒で渡してください（受け取った値: ${ms}）`);
  }
  if (ms < 0) {
    throw new RangeError(`時刻は0以上で渡してください（受け取った値: ${ms}）`);
  }
  const spec = FRAME_RATE_SPECS[frameRate];
  if (spec === undefined) {
    throw new Error(`対応していないフレームレートです: ${frameRate}（対応: ${FRAME_RATES}）`);
  }
  if (isDropFrame && !supportsDropFrame(frameRate)) {
    throw new Error(`ドロップフレームは 29.97 / 59.94 だけです（選ばれた値: ${frameRate}）`);
  }
  const frameCount = Math.round((ms * spec.numerator) / (spec.denominator * MS_PER_SECOND));
  const label = isDropFrame ? addDroppedFrames(frameCount, spec) : frameCount;
  return formatFrameLabel(label, spec.framesPerSecond, isDropFrame ? ";" : ":");
}

// 実際のフレーム番号に、それまでに飛ばした番号の数を足して、タイムコード上の番号にする
function addDroppedFrames(frameCount, { framesPerSecond, droppedFrames }) {
  const framesPerMinute = framesPerSecond * SECONDS_PER_MINUTE - droppedFrames;
  const framesPerCycle = framesPerMinute * MINUTES_PER_DROP_CYCLE + droppedFrames;
  const cycles = Math.floor(frameCount / framesPerCycle);
  const framesInCycle = frameCount % framesPerCycle;
  const droppedPerCycle = droppedFrames * (MINUTES_PER_DROP_CYCLE - 1);
  // 10分の頭の1分は飛ばさないので、その分を除いてから何分目かを数える
  const droppedInCycle =
    framesInCycle < droppedFrames
      ? 0
      : droppedFrames * Math.floor((framesInCycle - droppedFrames) / framesPerMinute);
  return frameCount + droppedPerCycle * cycles + droppedInCycle;
}

function formatFrameLabel(label, framesPerSecond, frameSeparator) {
  const frames = label % framesPerSecond;
  const totalSeconds = Math.floor(label / framesPerSecond);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}${frameSeparator}${pad(frames)}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}
