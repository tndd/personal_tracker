import { spawn } from 'node:child_process';

/**
 * Next.jsの開発サーバーをSTG環境で起動する補助スクリプト。
 * npmスクリプトから実行し、ENVIRONMENTを強制的にSTGへ設定する。
 */
console.log('🌐 STG環境でNext.js開発サーバーを起動します...');

process.env.ENVIRONMENT = 'STG';

const child = spawn('npm run dev', {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    ENVIRONMENT: 'STG',
  },
});

const forwardSignal = (signal: NodeJS.Signals) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on('SIGINT', () => forwardSignal('SIGINT'));
process.on('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code) => {
  if (code !== null) {
    process.exit(code);
  } else {
    process.exit(0);
  }
});

child.on('error', (error) => {
  console.error('❌ npm run dev の起動に失敗しました:', error);
  process.exit(1);
});
