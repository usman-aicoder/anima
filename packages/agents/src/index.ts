export { GrowthAgent, startServer as startGrowthServer, GROWTH_TOOLS } from './growth/index.js';
export { StrategyAgent, runIntake, buildGoalTree, generateHumanTasks, ingestDocument, INTAKE_QUESTIONS } from './strategy/index.js';
export type { IntakeAnswer, OnboardingResult, GoalTreeInput, HumanTaskDraft, ExtractedFact } from './strategy/index.js';
export { OperationsAgent, startOperationsServer, OPERATIONS_TOOLS } from './operations/index.js';
