const NOT_UTF8_MESSAGE =
  "文字コードが UTF-8 ではないため読み込めません。字幕ファイルを UTF-8 で保存し直してください。";

/**
 * ファイルの中身（バイト列）を UTF-8 として読み、文字列にする。先頭の BOM は取り除く。
 *
 * @param {ArrayBuffer | Uint8Array} bytes - ファイルから読んだバイト列。
 * @returns {string} 読み取った文字列。
 * @throws {TypeError} bytes がバイト列でない場合。
 * @throws {Error} UTF-8 として正しくないバイトが含まれる場合。
 */
export function decodeUtf8(bytes) {
  if (!(bytes instanceof ArrayBuffer) && !(bytes instanceof Uint8Array)) {
    throw new TypeError(
      `バイト列（ArrayBuffer か Uint8Array）で渡してください（受け取った型: ${typeof bytes}）`,
    );
  }
  // fatal: true にすると、不正なバイトを「�」に置き換えずに例外にしてくれる
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    return decoder.decode(bytes);
  } catch {
    // TextDecoder の英語の例外を、利用者向けの説明つきエラーに置き換える
    throw new Error(NOT_UTF8_MESSAGE);
  }
}
