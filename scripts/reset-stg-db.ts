/**
 * STG環境のデータベースをリセットするスクリプト
 */
import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL_STG!, { prepare: false });

  try {
    console.log('🗑️  STG環境のテーブルを削除します...');

    // 全テーブルを削除（外部キー制約を考慮した順序）
    await sql`DROP TABLE IF EXISTS track CASCADE`;
    console.log('  ✓ track テーブルを削除');

    await sql`DROP TABLE IF EXISTS daily CASCADE`;
    console.log('  ✓ daily テーブルを削除');

    await sql`DROP TABLE IF EXISTS tag CASCADE`;
    console.log('  ✓ tag テーブルを削除');

    await sql`DROP TABLE IF EXISTS category CASCADE`;
    console.log('  ✓ category テーブルを削除');

    console.log('\n✅ STG環境のデータベースをリセットしました');
    console.log('   次のコマンドを実行してください:');
    console.log('   1. ENVIRONMENT=STG npm run db:push');
    console.log('   2. npm run seed:stg');

  } finally {
    await sql.end();
  }
}

main().catch(console.error);
