const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

/**
 * ミリ秒を SRT の時刻の形（"00:01:02,345"）の文字にする。
 * F7 でフレーム単位のタイムコードに置き換えるまでの、一覧の表示用。
 *
 * @param {number} ms - 時刻（0以上の整数のミリ秒）。
 * @returns {string} "時:分:秒,ミリ秒" の文字。
 * @throws {TypeError} ms が整数でない場合（NaN・数値以外を含む）。
 * @throws {RangeError} ms が負の場合。
 */
export function formatSrtTime(ms) {
  if (!Number.isInteger(ms)) {
    throw new TypeError(`時刻は整数のミリ秒で渡してください（受け取った値: ${ms}）`);
  }
  if (ms < 0) {
    throw new RangeError(`時刻は0以上で渡してください（受け取った値: ${ms}）`);
  }
  const totalSeconds = Math.floor(ms / MS_PER_SECOND);
  const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  const milliseconds = ms % MS_PER_SECOND;
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
}

function pad(value, length) {
  return String(value).padStart(length, "0");
}
