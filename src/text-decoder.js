import { decodeUtf8 } from "./utf8-decoder.js";

const ENCODING_UTF8 = "UTF-8";
const ENCODING_SHIFT_JIS = "Shift_JIS";
const UNSUPPORTED_ENCODING_MESSAGE =
  "文字コードが UTF-8 でも Shift_JIS でもないため読み込めません。" +
  "UTF-8 か Shift_JIS で保存し直してください。";

/**
 * ファイルの中身（バイト列）の文字コードを見分けて、文字列にする。
 * UTF-8 として読めなければ Shift_JIS（Excel が保存する Windows の拡張版）として読む。
 *
 * @param {ArrayBuffer | Uint8Array} bytes - ファイルから読んだバイト列。
 * @returns {{ text: string, encoding: "UTF-8" | "Shift_JIS" }}
 *   読み取った文字列（UTF-8 の BOM は取り除く）と、読めた文字コード。
 * @throws {TypeError} bytes がバイト列でない場合。
 * @throws {Error} UTF-8 でも Shift_JIS でもない場合。
 */
export function decodeText(bytes) {
  if (!(bytes instanceof ArrayBuffer) && !(bytes instanceof Uint8Array)) {
    throw new TypeError(
      `バイト列（ArrayBuffer か Uint8Array）で渡してください（受け取った型: ${typeof bytes}）`,
    );
  }
  // Shift_JIS のファイルが UTF-8 として正しくなることはまずないので、UTF-8 を先に試す
  try {
    return { text: decodeUtf8(bytes), encoding: ENCODING_UTF8 };
  } catch {
    return { text: decodeShiftJis(bytes), encoding: ENCODING_SHIFT_JIS };
  }
}

function decodeShiftJis(bytes) {
  // fatal: true にすると、不正なバイトを「�」に置き換えずに例外にしてくれる
  const decoder = new TextDecoder("shift_jis", { fatal: true });
  try {
    return decoder.decode(bytes);
  } catch {
    // TextDecoder の英語の例外を、利用者向けの説明つきエラーに置き換える
    throw new Error(UNSUPPORTED_ENCODING_MESSAGE);
  }
}
