# 字幕チェック用Webアプリ

YouTube動画をダウンロードせずに、自作した字幕を字幕制作企業にチェックしてもらうためのWebアプリ。
設計の全体像は [仕様設計書.md](仕様設計書.md)、機能ごとの実装計画は [docs/specs/](docs/specs/) を参照。

## できること（実装済み）

- F1 動画の読み込み: YouTubeのURLを貼り付けると自動で埋め込みプレイヤーに表示する（手で打ち込んだ場合は Enter）
- F2 字幕の読み込み: 動画の右側の枠で SRT ファイル（UTF-8）を選択 or ドラッグすると読み込み、件数・警告・エラーを表示する

## 必要なもの

- Node.js（テスト・リンタ用。v24 で確認）
- uv（ローカルで画面を開くための簡易サーバー用）

## 準備（最初に1回）

```bash
npm install
```

ESLint・Prettier（開発用のチェック道具）が入る。アプリ本体はこれらを使わない。

## 画面をローカルで開く

JavaScript を部品ごとのファイル（ESモジュール）に分けているため、`index.html` をダブルクリックで開いても動かない。
簡易サーバーを立ち上げてから開く。

```bash
uv run --no-project python -m http.server 8000
```

ブラウザで <http://localhost:8000> を開く。

## テスト・チェック

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run format:check
```

見た目の整形をまとめて直すときは `npm run format`。

## ファイル構成

```
index.html                   画面
src/
  main.js                    画面と各部品をつなぐ
  youtube-url.js             URL → 動画ID
  player-error-message.js    プレイヤーのエラーコード → 日本語メッセージ
  youtube-player.js          YouTube IFrame Player API の読み込みと操作
  utf8-decoder.js            ファイルのバイト列 → UTF-8 の文字列
  srt-parser.js              SRT の文字列 → 字幕の一覧（番号・開始・終了・本文）
  srt-file-picker.js         選択・ドラッグされたファイル → 読み込む SRT ファイル1つ
tests/                       node --test で動くテスト
docs/specs/                  作業中の実装計画（完了したものは docs/specs/archive/）
```
