/**
 * STG環境に3ヶ月分のサンプルデータを投入するスクリプト
 *
 * 使い方:
 *   npm run seed:stg
 *
 * または:
 *   ENVIRONMENT=STG npm run seed:stg
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { categories, tags, tracks, dailies } from '../src/lib/db/schema';

// 環境変数のチェック
const environment = process.env.ENVIRONMENT || 'TEST';
console.log(`🔧 環境: ${environment}`);

if (environment !== 'STG') {
  console.error('❌ エラー: このスクリプトはSTG環境でのみ実行できます');
  console.error('   実行方法: ENVIRONMENT=STG npm run seed:stg');
  process.exit(1);
}

// データベース接続URL取得
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL_STG;
  if (!url) {
    console.error('❌ エラー: DATABASE_URL_STG が設定されていません');
    process.exit(1);
  }
  return url;
};

const databaseUrl = getDatabaseUrl();
console.log('📦 STG環境のデータベースに接続します');

// データベース接続
const sql = postgres(databaseUrl, { prepare: false, max: 1 });
const db = drizzle(sql);

// カテゴリID（固定 - RFC 4122準拠のUUID v4形式）
const CATEGORY_SYMPTOM = '11111111-1111-4111-8111-111111111111';
const CATEGORY_MEDICATION = '22222222-2222-4222-8222-222222222222';
const CATEGORY_ACTIVITY = '33333333-3333-4333-8333-333333333333';

// タグID（固定 - RFC 4122準拠のUUID v4形式）
const TAG_HEADACHE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TAG_DIZZY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab';
const TAG_NAUSEA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac';
const TAG_LOXONIN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TAG_DEPAS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc';
const TAG_STOMACH = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd';
const TAG_WALK = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TAG_EXERCISE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccd';
const TAG_SLEEP = 'cccccccc-cccc-4ccc-8ccc-ccccccccccce';

async function main() {
  try {
    console.log('🗑️  既存データをクリア中...');
    await db.delete(tracks);
    await db.delete(dailies);
    await db.delete(tags);
    await db.delete(categories);
    console.log('✅ 既存データをクリアしました');

    console.log('📝 カテゴリを作成中...');
    await db.insert(categories).values([
      { id: CATEGORY_SYMPTOM, name: '症状', color: '#ef4444', sortOrder: 0 },
      { id: CATEGORY_MEDICATION, name: '服薬', color: '#3b82f6', sortOrder: 1 },
      { id: CATEGORY_ACTIVITY, name: '活動', color: '#10b981', sortOrder: 2 },
    ]);
    console.log('✅ カテゴリを作成しました（3件）');

    console.log('🏷️  タグを作成中...');
    await db.insert(tags).values([
      { id: TAG_HEADACHE, categoryId: CATEGORY_SYMPTOM, name: '頭痛', sortOrder: 0 },
      { id: TAG_DIZZY, categoryId: CATEGORY_SYMPTOM, name: 'めまい', sortOrder: 1 },
      { id: TAG_NAUSEA, categoryId: CATEGORY_SYMPTOM, name: '吐き気', sortOrder: 2 },
      { id: TAG_LOXONIN, categoryId: CATEGORY_MEDICATION, name: 'ロキソニン', sortOrder: 0 },
      { id: TAG_DEPAS, categoryId: CATEGORY_MEDICATION, name: 'デパス', sortOrder: 1 },
      { id: TAG_STOMACH, categoryId: CATEGORY_MEDICATION, name: '胃薬', sortOrder: 2 },
      { id: TAG_WALK, categoryId: CATEGORY_ACTIVITY, name: '散歩', sortOrder: 0 },
      { id: TAG_EXERCISE, categoryId: CATEGORY_ACTIVITY, name: '運動', sortOrder: 1 },
      { id: TAG_SLEEP, categoryId: CATEGORY_ACTIVITY, name: '睡眠', sortOrder: 2 },
    ]);
    console.log('✅ タグを作成しました（9件）');

    console.log('📊 トラックデータを作成中...');
    const trackData = generateTrackData();

    // バッチ処理（50件ずつ）
    const batchSize = 50;
    for (let i = 0; i < trackData.length; i += batchSize) {
      const batch = trackData.slice(i, i + batchSize);
      await db.insert(tracks).values(batch);
      console.log(`  ${Math.min(i + batchSize, trackData.length)}/${trackData.length} 件作成完了`);
    }
    console.log(`✅ トラックデータを作成しました（${trackData.length}件）`);

    console.log('📅 日記データを作成中...');
    const dailyData = generateDailyData();
    await db.insert(dailies).values(dailyData);
    console.log(`✅ 日記データを作成しました（${dailyData.length}件）`);

    console.log('');
    console.log('🎉 サンプルデータの投入が完了しました！');
    console.log('   http://localhost:3000 にアクセスして確認してください');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// トラックデータ生成関数
function generateTrackData() {
  const data = [];

  // 3ヶ月分のトラックデータ（2025-07-18 〜 2025-10-16）
  const trackRecords: Array<{memo: string; condition: number; tagIds: string[]; date: string; time: string}> = [
    // 2025-07-18
    { memo: '朝7時起床。頭が重い感じがする', condition: -1, tagIds: [TAG_HEADACHE], date: '2025-07-18', time: '07:15:00' },
    { memo: 'ロキソニン1錠服用', condition: 0, tagIds: [TAG_LOXONIN], date: '2025-07-18', time: '09:30:00' },
    { memo: '午後は少し楽になった。読書して過ごす', condition: 0, tagIds: [], date: '2025-07-18', time: '15:00:00' },

    // 2025-07-19
    { memo: 'よく眠れた。朝から調子が良い', condition: 1, tagIds: [TAG_SLEEP], date: '2025-07-19', time: '08:00:00' },
    { memo: '公園を30分散歩。気持ちいい', condition: 2, tagIds: [TAG_WALK], date: '2025-07-19', time: '10:30:00' },
    { memo: '夕食後も元気。良い一日だった', condition: 1, tagIds: [], date: '2025-07-19', time: '19:00:00' },

    // 2025-07-20
    { memo: '朝から少しめまいがする', condition: -1, tagIds: [TAG_DIZZY], date: '2025-07-20', time: '07:30:00' },
    { memo: 'デパス服用。横になって休む', condition: 0, tagIds: [TAG_DEPAS], date: '2025-07-20', time: '11:00:00' },
    { memo: '午後になって少し回復', condition: 0, tagIds: [], date: '2025-07-20', time: '16:00:00' },

    // 2025-07-21
    { memo: '普通の朝。特に問題なし', condition: 0, tagIds: [], date: '2025-07-21', time: '08:00:00' },
    { memo: 'ストレッチを20分。体が軽くなる', condition: 1, tagIds: [TAG_EXERCISE], date: '2025-07-21', time: '14:00:00' },
    { memo: '夜は早めに就寝', condition: 0, tagIds: [], date: '2025-07-21', time: '21:30:00' },

    // 2025-07-22
    { memo: '朝起きたら頭痛。天気のせいか', condition: -1, tagIds: [TAG_HEADACHE], date: '2025-07-22', time: '07:00:00' },
    { memo: 'ロキソニン服用。水を多めに飲む', condition: 0, tagIds: [TAG_LOXONIN], date: '2025-07-22', time: '09:00:00' },
    { memo: '昼頃には良くなった', condition: 0, tagIds: [], date: '2025-07-22', time: '13:00:00' },

    // 2025-07-23
    { memo: '調子良好。朝から活動的', condition: 1, tagIds: [], date: '2025-07-23', time: '08:30:00' },
    { memo: '近所を40分散歩。すれ違う人と挨拶', condition: 2, tagIds: [TAG_WALK], date: '2025-07-23', time: '10:00:00' },
    { memo: '午後も快調。掃除もできた', condition: 1, tagIds: [], date: '2025-07-23', time: '16:00:00' },

    // 2025-07-24
    { memo: '朝から吐き気がある', condition: -2, tagIds: [TAG_NAUSEA], date: '2025-07-24', time: '07:30:00' },
    { memo: '胃薬服用。食欲なし', condition: -1, tagIds: [TAG_STOMACH], date: '2025-07-24', time: '10:00:00' },
    { memo: '夕方まで横になっていた', condition: -1, tagIds: [], date: '2025-07-24', time: '17:00:00' },

    // 2025-07-25
    { memo: '昨日よりは良くなった', condition: 0, tagIds: [], date: '2025-07-25', time: '08:00:00' },
    { memo: '軽めの食事。少しずつ食べる', condition: 0, tagIds: [], date: '2025-07-25', time: '12:30:00' },
    { memo: '夜は普通に過ごせた', condition: 0, tagIds: [], date: '2025-07-25', time: '20:00:00' },

    // 2025-07-26
    { memo: '朝からスッキリ。体調回復', condition: 1, tagIds: [], date: '2025-07-26', time: '07:45:00' },
    { memo: '久しぶりに軽い運動。15分ストレッチ', condition: 1, tagIds: [TAG_EXERCISE], date: '2025-07-26', time: '11:00:00' },
    { memo: '午後も調子良い', condition: 1, tagIds: [], date: '2025-07-26', time: '15:30:00' },

    // 2025-07-27
    { memo: '普通の朝。いつも通り', condition: 0, tagIds: [], date: '2025-07-27', time: '08:15:00' },
    { memo: '買い物ついでに散歩', condition: 0, tagIds: [TAG_WALK], date: '2025-07-27', time: '14:00:00' },
    { memo: '夜は読書', condition: 0, tagIds: [], date: '2025-07-27', time: '21:00:00' },

    // 2025-07-28
    { memo: '朝から頭が痛い。気圧のせいかも', condition: -1, tagIds: [TAG_HEADACHE], date: '2025-07-28', time: '07:00:00' },
    { memo: 'ロキソニン服用', condition: 0, tagIds: [TAG_LOXONIN], date: '2025-07-28', time: '09:30:00' },
    { memo: '午後には回復。少し散歩', condition: 0, tagIds: [TAG_WALK], date: '2025-07-28', time: '16:00:00' },

    // 2025-07-29
    { memo: 'よく眠れた。朝から元気', condition: 1, tagIds: [TAG_SLEEP], date: '2025-07-29', time: '08:00:00' },
    { memo: '朝の運動30分。気持ち良い', condition: 2, tagIds: [TAG_EXERCISE], date: '2025-07-29', time: '09:00:00' },
    { memo: '一日中調子が良かった', condition: 1, tagIds: [], date: '2025-07-29', time: '19:00:00' },

    // 2025-07-30
    { memo: '普通の朝', condition: 0, tagIds: [], date: '2025-07-30', time: '08:30:00' },
    { memo: '昼食後に散歩', condition: 0, tagIds: [TAG_WALK], date: '2025-07-30', time: '13:00:00' },
    { memo: '特に問題なく過ごせた', condition: 0, tagIds: [], date: '2025-07-30', time: '20:00:00' },

    // 2025-07-31
    { memo: '朝から少しめまい', condition: -1, tagIds: [TAG_DIZZY], date: '2025-07-31', time: '07:30:00' },
    { memo: 'デパス服用して休む', condition: 0, tagIds: [TAG_DEPAS], date: '2025-07-31', time: '10:00:00' },
    { memo: '夕方には良くなった', condition: 0, tagIds: [], date: '2025-07-31', time: '17:30:00' },

    // 8月のデータ（簡略版 - パターンを繰り返す）
    { memo: '8月スタート。朝から調子良い', condition: 1, tagIds: [], date: '2025-08-01', time: '08:00:00' },
    { memo: '公園を散歩。夏の緑がきれい', condition: 1, tagIds: [TAG_WALK], date: '2025-08-01', time: '10:30:00' },
    { memo: '午後も快調', condition: 1, tagIds: [], date: '2025-08-01', time: '16:00:00' },

    { memo: '朝から頭痛。暑さのせいか', condition: -1, tagIds: [TAG_HEADACHE], date: '2025-08-02', time: '07:15:00' },
    { memo: 'ロキソニン服用。水分補給', condition: 0, tagIds: [TAG_LOXONIN], date: '2025-08-02', time: '09:00:00' },
    { memo: '涼しい部屋で過ごす', condition: 0, tagIds: [], date: '2025-08-02', time: '15:00:00' },

    { memo: 'よく眠れた。朝は涼しい', condition: 1, tagIds: [TAG_SLEEP], date: '2025-08-03', time: '07:30:00' },
    { memo: '早朝散歩。気持ちいい', condition: 2, tagIds: [TAG_WALK], date: '2025-08-03', time: '08:00:00' },
    { memo: '日中は暑いが調子は良い', condition: 1, tagIds: [], date: '2025-08-03', time: '14:00:00' },

    // 9月のデータ（簡略版）
    { memo: '9月スタート。朝は涼しい', condition: 1, tagIds: [], date: '2025-09-01', time: '08:00:00' },
    { memo: '散歩35分。秋の気配', condition: 2, tagIds: [TAG_WALK], date: '2025-09-01', time: '10:00:00' },
    { memo: '気持ちの良い一日', condition: 1, tagIds: [], date: '2025-09-01', time: '17:00:00' },

    { memo: '朝から頭が重い', condition: -1, tagIds: [TAG_HEADACHE], date: '2025-09-02', time: '07:15:00' },
    { memo: 'ロキソニン服用', condition: 0, tagIds: [TAG_LOXONIN], date: '2025-09-02', time: '09:00:00' },
    { memo: '昼過ぎには楽になった', condition: 0, tagIds: [], date: '2025-09-02', time: '14:00:00' },

    // 10月のデータ（今日まで）
    { memo: '10月スタート。朝は涼しくて気持ち良い', condition: 1, tagIds: [], date: '2025-10-01', time: '08:00:00' },
    { memo: '散歩30分。秋が深まってきた', condition: 1, tagIds: [TAG_WALK], date: '2025-10-01', time: '10:30:00' },
    { memo: '気持ちの良い一日', condition: 1, tagIds: [], date: '2025-10-01', time: '17:00:00' },

    { memo: '朝起床。少し頭痛がする', condition: -1, tagIds: [TAG_HEADACHE], date: '2025-10-16', time: '07:15:00' },
    { memo: 'ロキソニン服用', condition: 0, tagIds: [TAG_LOXONIN], date: '2025-10-16', time: '09:30:00' },
    { memo: '昼食後に散歩。調子良い', condition: 1, tagIds: [TAG_WALK], date: '2025-10-16', time: '13:00:00' },
  ];

  // データをフォーマット
  for (const record of trackRecords) {
    data.push({
      memo: record.memo,
      condition: record.condition,
      tagIds: record.tagIds,
      createdAt: new Date(`${record.date}T${record.time}+09:00`),
      updatedAt: new Date(),
    });
  }

  return data;
}

// 日記データ生成関数
function generateDailyData() {
  const data = [];

  // 3ヶ月分の日記データ
  const dailyRecords: Array<{ date: string; memo: string; condition: number }> = [
    { date: '2025-07-18', memo: '朝から頭痛があったが、薬が効いて午後は少し楽になった。ゆっくり過ごした一日。', condition: -1 },
    { date: '2025-07-19', memo: 'とても調子が良い日。よく眠れたおかげか体が軽い。散歩も気持ちよかった。', condition: 2 },
    { date: '2025-07-20', memo: 'めまいがして辛い一日。薬を飲んで横になっていた。午後には少し回復。', condition: -1 },
    { date: '2025-08-01', memo: '8月のスタート。調子良好。散歩を楽しめた。夏の緑が美しい。', condition: 1 },
    { date: '2025-09-01', memo: '9月スタート。朝は涼しくて気持ち良い。秋の気配を感じる散歩。', condition: 2 },
    { date: '2025-10-01', memo: '10月スタート。朝は涼しくて気持ち良い。秋が深まってきた。', condition: 1 },
    { date: '2025-10-16', memo: '朝は頭痛があったが、薬で回復。昼食後の散歩は気持ちよかった。', condition: 0 },
  ];

  for (const record of dailyRecords) {
    data.push({
      date: record.date,
      memo: record.memo,
      condition: record.condition,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return data;
}

// スクリプト実行
main();
