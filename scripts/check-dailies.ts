/**
 * dailiesテーブルのcondition状態を確認するスクリプト
 */
import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL_STG!, { prepare: false });

  try {
    // dailiesテーブルの最新データを確認
    const dailies = await sql`
      SELECT
        date,
        condition,
        memo IS NOT NULL as has_memo,
        sleep_start IS NOT NULL as has_sleep_start,
        sleep_end IS NOT NULL as has_sleep_end
      FROM daily
      ORDER BY date DESC
      LIMIT 10
    `;

    console.log('📅 最新10日分のdailyデータ:');
    console.table(dailies);

    // 統計情報
    const stats = await sql`
      SELECT
        COUNT(*) as total_count,
        COUNT(condition) as with_condition,
        COUNT(memo) as with_memo,
        COUNT(sleep_start) as with_sleep_start,
        AVG(CASE WHEN condition IS NOT NULL THEN condition::numeric END) as avg_condition
      FROM daily
    `;

    console.log('\n📊 dailiesの統計:');
    console.log(stats[0]);

    // condition別の分布
    const distribution = await sql`
      SELECT
        condition,
        COUNT(*) as count
      FROM daily
      WHERE condition IS NOT NULL
      GROUP BY condition
      ORDER BY condition
    `;

    console.log('\n📈 condition値の分布:');
    console.table(distribution);

  } finally {
    await sql.end();
  }
}

main().catch(console.error);
