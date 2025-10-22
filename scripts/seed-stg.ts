/**
 * STG環境に6ヶ月分のサンプルデータを投入するスクリプト
 * プラス・ニュートラル・マイナスのコンディションをバランスよく生成
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
const resolvedEnvironment = (() => {
  const raw = process.env.ENVIRONMENT;
  if (!raw) {
    console.log('ℹ️  ENVIRONMENT が未指定だったため STG を適用します');
    process.env.ENVIRONMENT = 'STG';
    return 'STG';
  }
  const upper = raw.toUpperCase();
  process.env.ENVIRONMENT = upper;
  return upper;
})();
console.log(`🔧 環境: ${resolvedEnvironment}`);

if (resolvedEnvironment !== 'STG') {
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
// 症状
const TAG_HEADACHE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TAG_DIZZY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab';
const TAG_NAUSEA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac';
const TAG_FATIGUE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaad';
const TAG_INSOMNIA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaae';
const TAG_STOMACHACHE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaf';

// 服薬
const TAG_LOXONIN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TAG_DEPAS = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc';
const TAG_STOMACH_MED = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbd';
const TAG_SUPPLEMENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbe';

// 活動
const TAG_WALK = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TAG_EXERCISE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccd';
const TAG_SLEEP_GOOD = 'cccccccc-cccc-4ccc-8ccc-ccccccccccce';
const TAG_STRETCH = 'cccccccc-cccc-4ccc-8ccc-cccccccccccf';
const TAG_HYDRATION = 'cccccccc-cccc-4ccc-8ccc-cccccccccc10';
const TAG_MEAL = 'cccccccc-cccc-4ccc-8ccc-cccccccccc11';

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
      // 症状タグ
      { id: TAG_HEADACHE, categoryId: CATEGORY_SYMPTOM, name: '頭痛', sortOrder: 0 },
      { id: TAG_DIZZY, categoryId: CATEGORY_SYMPTOM, name: 'めまい', sortOrder: 1 },
      { id: TAG_NAUSEA, categoryId: CATEGORY_SYMPTOM, name: '吐き気', sortOrder: 2 },
      { id: TAG_FATIGUE, categoryId: CATEGORY_SYMPTOM, name: '倦怠感', sortOrder: 3 },
      { id: TAG_INSOMNIA, categoryId: CATEGORY_SYMPTOM, name: '不眠', sortOrder: 4 },
      { id: TAG_STOMACHACHE, categoryId: CATEGORY_SYMPTOM, name: '腹痛', sortOrder: 5 },
      // 服薬タグ
      { id: TAG_LOXONIN, categoryId: CATEGORY_MEDICATION, name: 'ロキソニン', sortOrder: 0 },
      { id: TAG_DEPAS, categoryId: CATEGORY_MEDICATION, name: 'デパス', sortOrder: 1 },
      { id: TAG_STOMACH_MED, categoryId: CATEGORY_MEDICATION, name: '胃薬', sortOrder: 2 },
      { id: TAG_SUPPLEMENT, categoryId: CATEGORY_MEDICATION, name: 'サプリ', sortOrder: 3 },
      // 活動タグ
      { id: TAG_WALK, categoryId: CATEGORY_ACTIVITY, name: '散歩', sortOrder: 0 },
      { id: TAG_EXERCISE, categoryId: CATEGORY_ACTIVITY, name: '運動', sortOrder: 1 },
      { id: TAG_SLEEP_GOOD, categoryId: CATEGORY_ACTIVITY, name: '良い睡眠', sortOrder: 2 },
      { id: TAG_STRETCH, categoryId: CATEGORY_ACTIVITY, name: 'ストレッチ', sortOrder: 3 },
      { id: TAG_HYDRATION, categoryId: CATEGORY_ACTIVITY, name: '水分補給', sortOrder: 4 },
      { id: TAG_MEAL, categoryId: CATEGORY_ACTIVITY, name: '食事', sortOrder: 5 },
    ]);
    console.log('✅ タグを作成しました（16件）');

    console.log('📅 日記データを作成中...');
    const { data: dailyData, conditionMap } = generateDailyData();
    await db.insert(dailies).values(dailyData);
    console.log(`✅ 日記データを作成しました（${dailyData.length}件）`);

    console.log('📊 トラックデータを作成中...');
    const trackData = generateTrackData(conditionMap);

    // バッチ処理（50件ずつ）
    const batchSize = 50;
    for (let i = 0; i < trackData.length; i += batchSize) {
      const batch = trackData.slice(i, i + batchSize);
      await db.insert(tracks).values(batch);
      console.log(`  ${Math.min(i + batchSize, trackData.length)}/${trackData.length} 件作成完了`);
    }
    console.log(`✅ トラックデータを作成しました（${trackData.length}件）`);

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

// タグごとの寄与度定義（翌日以降のdaily conditionへの影響）
const TAG_EFFECTS = {
  // 症状タグ（マイナス寄与）
  [TAG_HEADACHE]: { contribution: -1.2, variance: 0.4 },
  [TAG_DIZZY]: { contribution: -0.9, variance: 0.3 },
  [TAG_NAUSEA]: { contribution: -1.1, variance: 0.4 },
  [TAG_FATIGUE]: { contribution: -0.8, variance: 0.3 },
  [TAG_INSOMNIA]: { contribution: -1.3, variance: 0.4 },
  [TAG_STOMACHACHE]: { contribution: -1.0, variance: 0.3 },

  // 服薬タグ（弱いプラス寄与、または中立）
  [TAG_LOXONIN]: { contribution: 0.3, variance: 0.5 },
  [TAG_DEPAS]: { contribution: 0.2, variance: 0.5 },
  [TAG_STOMACH_MED]: { contribution: 0.4, variance: 0.4 },
  [TAG_SUPPLEMENT]: { contribution: 0.1, variance: 0.2 },

  // 活動タグ（プラス寄与）
  [TAG_WALK]: { contribution: 0.9, variance: 0.3 },
  [TAG_EXERCISE]: { contribution: 1.2, variance: 0.4 },
  [TAG_SLEEP_GOOD]: { contribution: 1.4, variance: 0.3 },
  [TAG_STRETCH]: { contribution: 0.7, variance: 0.3 },
  [TAG_HYDRATION]: { contribution: 0.3, variance: 0.2 },
  [TAG_MEAL]: { contribution: 0.5, variance: 0.3 },
} as const;

// トラックデータ生成関数
function generateTrackData(dailyConditions: Map<string, number>) {
  const data = [];

  // 今日から180日前までのデータを生成
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 179); // 180日分（今日を含む）

  // タグごとの出現確率（現実的なバランス）
  const tagProbabilities = {
    // 症状タグ（低頻度だが確実に出現）
    symptoms: {
      tags: [TAG_HEADACHE, TAG_DIZZY, TAG_NAUSEA, TAG_FATIGUE, TAG_INSOMNIA, TAG_STOMACHACHE],
      probability: 0.15, // 15%の日に症状あり
      multipleTagChance: 0.3, // 30%の確率で複数症状
    },
    // 活動タグ（高頻度）
    activities: {
      tags: [TAG_WALK, TAG_EXERCISE, TAG_SLEEP_GOOD, TAG_STRETCH, TAG_HYDRATION, TAG_MEAL],
      probability: 0.7, // 70%の日に何らかの活動記録
      multipleTagChance: 0.6, // 60%の確率で複数活動
    },
    // 服薬タグ（中頻度、症状がある時に出やすい）
    medications: {
      tags: [TAG_LOXONIN, TAG_DEPAS, TAG_STOMACH_MED, TAG_SUPPLEMENT],
      probability: 0.2, // 20%の日に服薬
      multipleTagChance: 0.2, // 20%の確率で複数服薬
    },
  };

  // メモのテンプレート
  const memos = {
    2: [
      '最高の気分！体調も気分も絶好調',
      '素晴らしい一日。エネルギーに満ちている',
      '体が軽い。何でもできそうな気がする',
      '気持ちよく目覚めた。完璧な体調',
    ],
    1: [
      '調子良い。今日も頑張れそう',
      'まあまあ良い感じ。普通に過ごせる',
      '体調は良好。特に問題なし',
      '気分も体調も悪くない',
    ],
    0: [
      '普通の状態。可もなく不可もなく',
      '特に変わったことはない',
      'いつも通り。平穏な一日',
      '普通に過ごせている',
    ],
    [-1]: [
      '少し調子が悪い。だるさを感じる',
      '頭が重い感じがする',
      'めまいがする。少し休みたい',
      '体がだるい。無理はしないようにしよう',
    ],
    [-2]: [
      'かなり辛い。横になって休む',
      '強い頭痛。動けない',
      '吐き気がひどい。食欲なし',
      '最悪の体調。一日中寝ていた',
    ],
  };

  // 時間帯のテンプレート
  const timeSlots = [
    { hour: 7, minute: () => Math.floor(Math.random() * 60) },
    { hour: 12, minute: () => Math.floor(Math.random() * 60) },
    { hour: 17, minute: () => Math.floor(Math.random() * 60) },
    { hour: 21, minute: () => Math.floor(Math.random() * 60) },
  ];

  // 180日分のデータを生成
  for (let dayOffset = 0; dayOffset < 180; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayOffset);
    const dateStr = currentDate.toISOString().split('T')[0];

    // この日の翌日のdaily conditionを取得（タグの影響を受ける側）
    const nextDate = new Date(currentDate);
    nextDate.setDate(currentDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];
    const nextDayCondition = dailyConditions.get(nextDateStr) ?? 0;

    // この日のtrack数（5-8件：現実的な範囲）
    const trackCount = 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < trackCount; i++) {
      // タグを選択（翌日のconditionに基づいて逆算的に選ぶ）
      let tagIds: string[] = [];

      // 翌日が良いコンディション → 今日は活動タグを多めに
      if (nextDayCondition >= 1) {
        if (Math.random() < tagProbabilities.activities.probability) {
          const activityTags = tagProbabilities.activities.tags;
          tagIds.push(activityTags[Math.floor(Math.random() * activityTags.length)]);

          // 複数タグの追加
          if (Math.random() < tagProbabilities.activities.multipleTagChance) {
            const secondTag = activityTags[Math.floor(Math.random() * activityTags.length)];
            if (!tagIds.includes(secondTag)) {
              tagIds.push(secondTag);
            }
          }
        }
      }

      // 翌日が悪いコンディション → 今日は症状タグを多めに
      if (nextDayCondition <= -1) {
        if (Math.random() < tagProbabilities.symptoms.probability * 3) { // 確率を高める
          const symptomTags = tagProbabilities.symptoms.tags;
          tagIds.push(symptomTags[Math.floor(Math.random() * symptomTags.length)]);

          // 複数タグの追加（悪い日は症状が重なりやすい）
          if (Math.random() < tagProbabilities.symptoms.multipleTagChance * 1.5) {
            const secondTag = symptomTags[Math.floor(Math.random() * symptomTags.length)];
            if (!tagIds.includes(secondTag)) {
              tagIds.push(secondTag);
            }
          }

          // 服薬タグも追加されやすい
          if (Math.random() < tagProbabilities.medications.probability * 2) {
            const medTags = tagProbabilities.medications.tags;
            tagIds.push(medTags[Math.floor(Math.random() * medTags.length)]);
          }
        }
      }

      // ニュートラルな日 → バランスよく
      if (nextDayCondition === 0) {
        // 活動タグ
        if (Math.random() < tagProbabilities.activities.probability * 0.6) {
          const activityTags = tagProbabilities.activities.tags;
          tagIds.push(activityTags[Math.floor(Math.random() * activityTags.length)]);
        }
        // 症状タグも少し
        if (Math.random() < tagProbabilities.symptoms.probability * 0.8) {
          const symptomTags = tagProbabilities.symptoms.tags;
          tagIds.push(symptomTags[Math.floor(Math.random() * symptomTags.length)]);
        }
      }

      // メモ（trackのconditionはdailyと独立なので適当に選ぶ）
      const trackCondition = [-2, -1, -1, 0, 0, 0, 0, 1, 1, 2][Math.floor(Math.random() * 10)];
      const memoList = memos[trackCondition as keyof typeof memos];
      const memo = memoList[Math.floor(Math.random() * memoList.length)];

      // 時間を決定（順番に時間帯を割り当て）
      const timeSlot = timeSlots[i % timeSlots.length];
      const hour = timeSlot.hour;
      const minute = timeSlot.minute();

      // ISO 8601形式で日時を作成（JST: UTC+9）
      const createdAt = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+09:00`);

      data.push({
        memo,
        condition: trackCondition,
        tagIds,
        createdAt,
        updatedAt: new Date(),
      });
    }
  }

  return data;
}

// 日記データ生成関数（毎日生成 + 睡眠時刻付き）
// conditionのMapも返す（trackデータ生成時に参照するため）
function generateDailyData(): { data: typeof dailies.$inferInsert[], conditionMap: Map<string, number> } {
  const data = [];
  const conditionMap = new Map<string, number>();

  // 今日から180日前までの日記データを毎日生成
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 179);

  const dailyMemos = [
    '今日は調子が良かった。充実した一日だった。',
    '普通の一日。特に変わったことはなかった。',
    '少し体調が優れなかったが、なんとか過ごせた。',
    '朝から元気で、色々なことができた。良い一日。',
    '体調がすぐれず、ゆっくり休んだ。明日は良くなりますように。',
    '散歩をして気分転換できた。体も少し軽くなった気がする。',
    '頭痛があって辛かった。薬を飲んで横になっていた。',
    'よく眠れたおかげで、朝からスッキリしていた。',
    '気圧の変化か、めまいがした。無理せず過ごした。',
    '久しぶりに運動できた。体を動かすと気持ちいい。',
    '今日もいつも通り過ごせた。',
    '疲れが溜まっている感じがする。早めに寝よう。',
    '天気が良くて気分が良かった。',
    '少し寝不足だったが、なんとか乗り切れた。',
    '仕事が忙しかったが、充実感がある。',
  ];

  for (let dayOffset = 0; dayOffset < 180; dayOffset++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + dayOffset);
    const dateStr = currentDate.toISOString().split('T')[0];

    // condition値をバランスよく選択（プラス・ニュートラル・マイナスを各33%程度）
    const conditionWeights = [-2, -2, -2, -1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2];
    const condition = conditionWeights[Math.floor(Math.random() * conditionWeights.length)];

    // Mapに保存
    conditionMap.set(dateStr, condition);

    // メモ（70%の確率で追加）
    const memo = Math.random() > 0.3
      ? dailyMemos[Math.floor(Math.random() * dailyMemos.length)]
      : null;

    // 睡眠時刻（90%の確率で記録）
    let sleepStart = null;
    let sleepEnd = null;

    if (Math.random() > 0.1) {
      // 就寝時刻: 22:00-2:00 (前日22時〜当日2時)
      const sleepHour = 22 + Math.floor(Math.random() * 5); // 22-26時
      const sleepMinute = Math.floor(Math.random() * 60);
      const actualSleepHour = sleepHour >= 24 ? sleepHour - 24 : sleepHour;
      const sleepDay = sleepHour >= 24 ? currentDate : new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);

      sleepStart = new Date(
        Date.UTC(
          sleepDay.getUTCFullYear(),
          sleepDay.getUTCMonth(),
          sleepDay.getUTCDate(),
          actualSleepHour - 9, // JSTからUTCに変換 (JST = UTC+9)
          sleepMinute
        )
      );

      // 起床時刻: 就寝から6-9時間後
      const sleepDuration = 6 + Math.random() * 3;
      sleepEnd = new Date(sleepStart.getTime() + sleepDuration * 60 * 60 * 1000);

    }

    data.push({
      date: dateStr,
      memo,
      condition,
      sleepStart,
      sleepEnd,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { data, conditionMap };
}

// スクリプト実行
main();
