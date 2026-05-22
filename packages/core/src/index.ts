// Database
export { connect, disconnect } from './db/connection.js';

// Company wiki types
export {
  WIKI_KEYS,
  type SeoKeyword,
  type ContentGuidelines,
  type TechStack,
  type PostingSchedule,
  type PartnerRequirements,
  type RequestSchema,
} from './types/company-wiki-types.js';

// Models
export { Goal, type IGoal } from './db/models/goal.model.js';
export { Task, type ITask } from './db/models/task.model.js';
export { AgentDecision, type IAgentDecision, type AgentName } from './db/models/agent-decision.model.js';
export { AgentSession, type IAgentSession } from './db/models/agent-session.model.js';
export { Provider, type IProvider } from './db/models/provider.model.js';
export { Capability, type ICapability } from './db/models/capability.model.js';
export { Customer, type ICustomer } from './db/models/customer.model.js';
export { Job, type IJob } from './db/models/job.model.js';
export { CompanyWiki, type ICompanyWiki } from './db/models/company-wiki.model.js';
export { AnimaDocument, type IDocument } from './db/models/document.model.js';
export { Escalation, type IEscalation } from './db/models/escalation.model.js';
export { QualityAlert, type IQualityAlert, type AlertType, type AlertSeverity } from './db/models/quality-alert.model.js';
export { QualityConfig, type IQualityConfig, DEFAULT_QUALITY_CONFIGS } from './db/models/quality-config.model.js';

// Core primitives
export { WorldModelClient } from './world-model-client.js';
export { compactMessages } from './harness/compaction.js';
export { DecisionLogger, type DecisionEntry } from './decision-logger.js';
export { SessionManager } from './session-manager.js';
export { GoalReader } from './goal-reader.js';
export {
  BaseAgent,
  type AgentContext,
  type ActionRequest,
  type ActionResult,
  type PreHookResult,
} from './base-agent.js';
