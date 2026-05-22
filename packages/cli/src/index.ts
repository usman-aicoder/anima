#!/usr/bin/env node
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface Answers {
  projectName: string;
  companyName: string;
  mongoUri: string;
  redisUrl: string;
  anthropicKey: string;
}

function ask(rl: readline.Interface, question: string, defaultVal?: string): Promise<string> {
  return new Promise((resolve) => {
    const prompt = defaultVal ? `${question} [${defaultVal}]: ` : `${question}: `;
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultVal || '');
    });
  });
}

async function collectAnswers(): Promise<Answers> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\nWelcome to Anima — AI Company Operating System');
  console.log('================================================\n');

  const projectName = await ask(rl, 'Project directory name', 'my-anima');
  const companyName = await ask(rl, 'Company name (used as World Model key)');
  const mongoUri = await ask(rl, 'MongoDB URI', 'mongodb://localhost:27017/anima');
  const redisUrl = await ask(rl, 'Redis URL', 'redis://localhost:6379');
  const anthropicKey = await ask(rl, 'Anthropic API key');

  rl.close();

  return { projectName, companyName, mongoUri, redisUrl, anthropicKey };
}

function writeEnv(targetDir: string, answers: Answers): void {
  const lines = [
    `MONGODB_URI=${answers.mongoUri}`,
    `REDIS_URL=${answers.redisUrl}`,
    `ANTHROPIC_API_KEY=${answers.anthropicKey}`,
    `COMPANY_NAME=${answers.companyName}`,
    `ANIMA_MODEL=claude-sonnet-4-6`,
    `ANIMA_TRANSPORT=stdio`,
    `PORT=3000`,
    `DASHBOARD_PORT=3001`,
    `GROWTH_AGENT_PORT=3010`,
    `STRATEGY_AGENT_PORT=3011`,
    `OPERATIONS_AGENT_PORT=3012`,
    `FINANCE_AGENT_PORT=3013`,
    `QUALITY_AGENT_PORT=3014`,
  ];
  fs.writeFileSync(path.join(targetDir, '.env'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(targetDir, '.env.example'), lines.map((l) => {
    const [key] = l.split('=');
    return `${key}=`;
  }).join('\n') + '\n');
}

function writePackageJson(targetDir: string, answers: Answers): void {
  const pkg = {
    name: answers.projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      start: 'node --loader ts-node/esm implementations/anima/src/index.ts',
      dev: 'tsx watch implementations/anima/src/index.ts',
      build: 'turbo run build',
      typecheck: 'turbo run typecheck',
    },
    dependencies: {
      '@anima/core': '^0.1.0',
      '@anima/agents': '^0.1.0',
    },
    devDependencies: {
      typescript: '^5.4.0',
      tsx: '^4.7.0',
    },
  };
  fs.writeFileSync(path.join(targetDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
}

function writeReadme(targetDir: string, answers: Answers): void {
  const content = `# ${answers.companyName} — powered by Anima

## Quick start

\`\`\`bash
# Install deps
pnpm install

# Start MongoDB and Redis locally, then:
pnpm dev
\`\`\`

Dashboard available at http://localhost:3001
API at http://localhost:3000

## Onboarding ${answers.companyName}

Open the dashboard and run the Strategy Agent onboarding interview.
Anima will build the goal tree and start operating autonomously.

## Environment

See \`.env.example\` for all required variables.
`;
  fs.writeFileSync(path.join(targetDir, 'README.md'), content);
}

async function main(): Promise<void> {
  const answers = await collectAnswers();

  if (!answers.companyName) {
    console.error('Company name is required.');
    process.exit(1);
  }

  const targetDir = path.resolve(process.cwd(), answers.projectName);

  if (fs.existsSync(targetDir)) {
    console.error(`Directory ${answers.projectName} already exists.`);
    process.exit(1);
  }

  console.log(`\nCreating project in ./${answers.projectName} ...`);
  fs.mkdirSync(targetDir, { recursive: true });

  writeEnv(targetDir, answers);
  writePackageJson(targetDir, answers);
  writeReadme(targetDir, answers);

  // Write a minimal docker-compose for local dev
  const compose = `version: '3.9'
services:
  mongo:
    image: mongo:7
    ports:
      - '27017:27017'
    volumes:
      - mongo_data:/data/db
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
volumes:
  mongo_data:
`;
  fs.writeFileSync(path.join(targetDir, 'docker-compose.yml'), compose);

  console.log('\nProject created successfully!');
  console.log(`\nNext steps:\n  cd ${answers.projectName}`);
  console.log('  docker compose up -d   # start MongoDB + Redis');
  console.log('  pnpm install');
  console.log('  pnpm dev\n');

  // Attempt pnpm install only if pnpm is available
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    console.log('Installing dependencies...');
    execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' });
  } catch {
    console.log('pnpm not found — run `pnpm install` manually after cd into the project.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
