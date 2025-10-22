# Tauri を用いたマルチプラットフォーム化 PoC 検討

## 概要
- Next.js + Drizzle/PostgreSQL を中心に構築された現行 Web アプリを、Tauri ベースでデスクトップ（Windows/macOS/Linux）およびモバイル（iOS/Android）へ展開するための技術検証タスク。
- データ永続化をローカル保存へ切り替え、外部サーバー依存を最小限に抑えるアーキテクチャ再設計が前提となる。

## 目的
1. Tauri が提供する公式プラグイン（SQL/Store/File System/Stronghold 等）を用いたローカル永続化の実現可否を確認する。
2. 現行の Next.js API Route で実装された業務ロジックを Rust 側コマンドへ段階的に移植する際の工数・リスクを洗い出す。
3. Android/iOS でのビルド、配布、サンドボックス制約下でのデータアクセスの実行可能性を評価する。

## 想定成果物
- iOS/Android/PC それぞれで最小限の CRUD が成立する PoC（Tauri バンドル + Rust コマンド + フロントエンド）
- データ保存方式別の比較表（SQLite, Store プラグイン, Stronghold 併用など）
- 技術的課題と必要な設計変更の一覧、および対応優先度

## 背景・現状
- 現行プロダクトは Next.js App Router 上で API Route と SSR を併用しており、`next export` では必要な動的機能が失われる。
- データベースは PostgreSQL を前提としているが、Tauri モバイル向け SQL プラグインは iOS サポートが未成熟である。
- ローカル保存を必須要件とするため、外部 DB/SaaS への接続に依存しない構成が必要。

## 最新確認事項（2025-10-22 時点）
- `@tauri-apps/plugin-sql` 2.3.0 の公式対応プラットフォームに iOS は含まれておらず、iOS 実機ではロード不可である（参考: [npm](https://www.npmjs.com/package/@tauri-apps/plugin-sql)）。
- 同プラグインをフォークした `tauri-plugin-rusqlite2` なども iOS/Android の安定実績がなく、PoC 用途でも実機検証が必須（参考: [lib.rs](https://lib.rs/crates/tauri-plugin-rusqlite2)）。
- Tauri v2 系はリリース頻度が高く、Android 15（API 36）対応に関する未解決 Issue が 2025-09-02 時点で公開されているため、SDK/Gradle 更新とバージョン固定戦略が必要（参考: [Issue #14141](https://github.com/tauri-apps/tauri/issues/14141)）。
- Next.js 公式が案内する Tauri 連携手順は `output: 'export'` 前提であり、SSR/API Routes はモバイル展開時に利用できない（参考: [Tauri × Next.js ガイド](https://v2.tauri.app/start/frontend/nextjs/)）。

## 課題・懸念
- 公式 SQL プラグインが iOS 未対応であるため、Rust 側で直接 `rusqlite` 等を利用し WebView 側とは `tauri::invoke` 経由でやり取りする設計に切り替える必要がある。
- ORM (Drizzle) をブラウザ側から利用できないため、既存 API Route のドメインロジックを Rust コマンドとして実装し直す計画が必須。
- iOS/Android のファイルサンドボックスで扱える SQLite ファイルの配置パス・バックアップ条件を確認し、`NSFileProtectionCompleteUntilFirstUserAuthentication` 等の属性設計を行う必要がある。
- Store プラグインは JSON キー値ストア、Stronghold は秘密情報保管向けであり、リレーショナルデータを直接置換できない。暗号化要件がある場合はデータ分離（メタデータは SQLite、シークレットは Stronghold）を前提にタスク化する。
- Android 15 / iOS 18 の新要件（例: 16KB ページング、Gradle 8.5 互換性、`UIScene` まわりのライフサイクル）に対する互換性試験を PoC フェーズに組み込む必要がある。
- 既存フロントエンドは SSR/API Routes 前提のため、少なくとも PoC では UI を SPA 化し、データ取得は Rust コマンド経由に置き換える作戦が必要。

## ローカルデータ永続化オプション（比較ドラフト）
| オプション | iOS 対応状況 | メリット | リスク/懸念 |
| --- | --- | --- | --- |
| Rust `rusqlite` 直利用（自前プラグイン） | Swift ブリッジ実装で対応可 | リレーショナルスキーマを維持しやすい | Swift/Java 側ラッパーの実装・保守コスト増 |
| `tauri-plugin-sql` | iOS × / Android ○ | 公式メンテ対象、Rust 側コード量が少ない | iOS 不可のためモバイル統一ができない |
| `tauri-plugin-rusqlite2` フォーク | iOS/Android 実績不足 | 公式 API と互換、SQLite 特化 | 実運用実績が少なく、保守先不明 |
| Store プラグイン + Stronghold | iOS/Android ○ | キー値ストア+秘密情報保存に強い | リレーショナル設計の再構築が必要 |
| 外部同期（Supabase/自前 API） | 要ネット接続 | 既存 Postgres スキーマ活用 | ローカル優先要件と矛盾、オフライン要件を満たせない |

## 対応方針（ドラフト）
### フェーズ 0: 調査・要件固め
- データ保存要件（容量、暗号化、バックアップ、マイグレーション頻度、同期要否）をプロダクト側と再確認。
- 公式/非公式プラグインの対応状況をリリースノート・コミュニティ Issue で確認し、`plugin-sql` 以外の選択肢を比較表に反映。
- Tauri v2 本体・CLI・周辺プラグインのバージョン固定方針とアップデート監視フローを定義。
- Android SDK/NDK、Gradle、Xcode Toolchain の最小バージョンと CI 上のセットアップ手順を固める。

### フェーズ 1: デスクトップ向け PoC
- Rust コマンド層で `rusqlite` または `sqlx`（デスクトップ限定）を用いた最小 CRUD を実装し、WebView から `invoke` 経由で利用。
- フロントは既存 UI コンポーネントを流用しつつ SPA 化し、Next.js 側 SSR/API Routes 依存を排除。
- `.sqlite` ファイルの生成・暗号化（必要に応じ `sqlcipher` 検討）・マイグレーション手順を確立。

### フェーズ 2: Android PoC
- Android ビルドターゲットを追加し、`cargo tauri android dev` のパイプラインを CI/ローカルで再現。
- API 34/35/36 のエミュレータおよび実機で CRUD 動作・ファイル配置（`Context.getDatabasePath` 相当）・バックアップ除外設定を検証。
- Store プラグインを利用した場合のパフォーマンス/データ容量比較を継続的に記録。
- Gradle 8.5 以降・Android 15 の互換性チェックをタスク化し、既知 Issue の回避策を調査。

### フェーズ 3: iOS PoC
- iOS ビルドターゲットを整備し、Swift ブリッジ経由で `rusqlite` を呼び出す暫定実装を作成（`plugin-sql` が利用できない前提で PoC）。
- Store プラグイン＋Stronghold の組み合わせでどこまで要件を満たせるかを検証し、暗号化が必要な列のみ Stronghold へ分離する案を整理。
- iOS サンドボックス内でのファイル配置（`Application Support`/`Library/Private Documents`）やバックアップ対象除外設定、`NSFileProtection` ポリシーを設計。

### フェーズ 4: アーキテクチャ再設計
- Rust コマンド層へ既存ドメインロジックを段階移植し、Web 版と機能差異が発生する領域を洗い出して同期戦略を検討。
- SQLite 用スキーマ管理（バージョンテーブル、段階的マイグレーション）と Postgres ➝ SQLite 変換ツールを設計。
- テスト戦略（Rust ユニットテスト、Tauri 統合テスト、Playwright 代替/併用）にモバイル自動化（XCUITest / Macrobenchmark）の導入可能性を検討。

## 完了条件（Done 定義案）
- デスクトップ/Android/iOS でローカル保存による CRUD PoC が実機/エミュレータで確認済み（Android 15・iOS 18 での動作含む）。
- データ保存方式比較表と採用案のリスク/対策、Fallback シナリオ（Store/Stronghold 併用）が明文化されている。
- Next.js 側の SSR/API Routes 移行計画が策定され、残タスクをチケット化できる粒度で整理済み。
- Tauri/CLI/プラグインのバージョン固定方針・アップデート監視手順が確立され、CI/CD で再現できる。
- 今後の本実装タスク群を工数見積もり付きで分割し、外部同期要件の有無に応じた追加 PoC 項目が整理されている。

## 未解決トピック（継続調査）
- モバイル配布（TestFlight/Play Console）時の証明書管理・CI/CD フローの設計。
- DB 暗号化要件が明確化した場合の追加プラグイン検討（`sqlcipher` / Stronghold）。
- 既存 Web 版との機能差異、オフライン同期やバックアップが必要かどうかの製品要件整理（必要なら同期プロトタイプの追加検討）。
- Tauri モバイル関連の既知 Issue（Android 15 互換性、iOS 音声再生など）の動向ウォッチと対策タスク化。

## 参考資料
- [Tauri v2 Plugins Workspace README](https://github.com/tauri-apps/plugins-workspace?tab=readme-ov-file)
- [Tauri SQL Plugin ドキュメント](https://v2.tauri.org.cn/reference/javascript/sql/)
- [Tauri Store Plugin ドキュメント](https://tauri.app/ja/plugin/store/)
- [Tauri File System Plugin ドキュメント](https://v2.tauri.org.cn/plugin/file-system/)
- [@tauri-apps/plugin-sql npm パッケージ](https://www.npmjs.com/package/@tauri-apps/plugin-sql)
- [tauri-plugin-rusqlite2 crate](https://lib.rs/crates/tauri-plugin-rusqlite2)
- [Android 15 互換性 Issue #14141](https://github.com/tauri-apps/tauri/issues/14141)
