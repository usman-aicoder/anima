import { Goal, type IGoal } from './db/models/goal.model.js';
import { Task, type ITask } from './db/models/task.model.js';
import { AgentDecision, type IAgentDecision } from './db/models/agent-decision.model.js';
import { AgentSession, type IAgentSession } from './db/models/agent-session.model.js';
import { Provider, type IProvider } from './db/models/provider.model.js';
import { Capability, type ICapability } from './db/models/capability.model.js';
import { Customer, type ICustomer } from './db/models/customer.model.js';
import { Job, type IJob } from './db/models/job.model.js';
import { CompanyWiki, type ICompanyWiki } from './db/models/company-wiki.model.js';
import { AnimaDocument, type IDocument } from './db/models/document.model.js';
import { Escalation, type IEscalation } from './db/models/escalation.model.js';
import { QualityAlert, type IQualityAlert } from './db/models/quality-alert.model.js';
import {
  QualityConfig,
  DEFAULT_QUALITY_CONFIGS,
  type IQualityConfig,
} from './db/models/quality-config.model.js';

// ─── Goals ───────────────────────────────────────────────────────────────────

export const goals = {
  findActive(owner_agent?: IGoal['owner_agent']): Promise<IGoal[]> {
    const filter: Record<string, unknown> = {
      status: 'active',
      'governance.approved_at': { $ne: null },
    };
    if (owner_agent) filter['owner_agent'] = owner_agent;
    return Goal.find(filter).lean<IGoal[]>().exec();
  },

  findById(goal_id: string): Promise<IGoal | null> {
    return Goal.findOne({ goal_id }).lean<IGoal>().exec();
  },

  findAtRisk(): Promise<IGoal[]> {
    return Goal.find({ status: 'at_risk', 'governance.approved_at': { $ne: null } })
      .lean<IGoal[]>()
      .exec();
  },

  create(data: Partial<IGoal>): Promise<IGoal> {
    return Goal.create(data);
  },

  updateStatus(goal_id: string, status: IGoal['status']): Promise<IGoal | null> {
    return Goal.findOneAndUpdate({ goal_id }, { status }, { new: true }).lean<IGoal>().exec();
  },

  updateProgress(
    goal_id: string,
    current_value: number,
    pct: number,
  ): Promise<IGoal | null> {
    return Goal.findOneAndUpdate(
      { goal_id },
      {
        $set: { 'metric.current_value': current_value, 'progress.pct': pct },
        $push: { 'progress.history': { value: current_value, measured_at: new Date() } },
      },
      { new: true },
    )
      .lean<IGoal>()
      .exec();
  },

  approve(goal_id: string, approved_by: string): Promise<IGoal | null> {
    return Goal.findOneAndUpdate(
      { goal_id },
      { 'governance.approved_by': approved_by, 'governance.approved_at': new Date(), status: 'active' },
      { new: true },
    )
      .lean<IGoal>()
      .exec();
  },
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasks = {
  find(filter: Partial<Pick<ITask, 'owner_agent' | 'status' | 'type'>>): Promise<ITask[]> {
    return Task.find(filter).lean<ITask[]>().exec();
  },

  findById(task_id: string): Promise<ITask | null> {
    return Task.findOne({ task_id }).lean<ITask>().exec();
  },

  create(data: Partial<ITask>): Promise<ITask> {
    return Task.create(data);
  },

  updateStatus(task_id: string, status: ITask['status']): Promise<ITask | null> {
    return Task.findOneAndUpdate({ task_id }, { status }, { new: true }).lean<ITask>().exec();
  },

  complete(
    task_id: string,
    completed_by: string,
    evidence: ITask['completion']['evidence'],
  ): Promise<ITask | null> {
    return Task.findOneAndUpdate(
      { task_id },
      {
        status: 'completed',
        'completion.completed_at': new Date(),
        'completion.completed_by': completed_by,
        'completion.evidence': evidence,
      },
      { new: true },
    )
      .lean<ITask>()
      .exec();
  },
};

// ─── Agent Decisions (read-only — writes go through DecisionLogger) ───────────

export const agentDecisions = {
  findRecent(agent: IAgentDecision['agent'], limit = 50): Promise<IAgentDecision[]> {
    return AgentDecision.find({ agent })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean<IAgentDecision[]>()
      .exec();
  },

  findBySession(session_id: string): Promise<IAgentDecision[]> {
    return AgentDecision.find({ session_id }).lean<IAgentDecision[]>().exec();
  },

  countByType(agent: IAgentDecision['agent'], decision_type: string): Promise<number> {
    return AgentDecision.countDocuments({ agent, decision_type });
  },
};

// ─── Agent Sessions (read-only — writes go through SessionManager) ────────────

export const agentSessions = {
  findById(session_id: string): Promise<IAgentSession | null> {
    return AgentSession.findOne({ session_id }).lean<IAgentSession>().exec();
  },

  findCrashed(agent: string): Promise<IAgentSession[]> {
    return AgentSession.find({ agent, status: 'crashed' }).lean<IAgentSession[]>().exec();
  },
};

// ─── Providers ───────────────────────────────────────────────────────────────

export const providers = {
  find(filter: Partial<Pick<IProvider, 'status' | 'active'>>): Promise<IProvider[]> {
    return Provider.find(filter).lean<IProvider[]>().exec();
  },

  findById(provider_id: string): Promise<IProvider | null> {
    return Provider.findOne({ provider_id }).lean<IProvider>().exec();
  },

  create(data: Partial<IProvider>): Promise<IProvider> {
    return Provider.create(data);
  },

  updateStatus(provider_id: string, status: IProvider['status']): Promise<IProvider | null> {
    return Provider.findOneAndUpdate({ provider_id }, { status }, { new: true })
      .lean<IProvider>()
      .exec();
  },
};

// ─── Capabilities ─────────────────────────────────────────────────────────────

export const capabilities = {
  find(): Promise<ICapability[]> {
    return Capability.find().lean<ICapability[]>().exec();
  },

  upsert(service_type: string, geography: string, data: Partial<ICapability>): Promise<ICapability | null> {
    return Capability.findOneAndUpdate(
      { service_type, geography },
      { ...data, updated_at: new Date() },
      { upsert: true, new: true },
    )
      .lean<ICapability>()
      .exec();
  },
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers = {
  findById(customer_id: string): Promise<ICustomer | null> {
    return Customer.findOne({ customer_id }).lean<ICustomer>().exec();
  },

  findByEmail(email: string): Promise<ICustomer | null> {
    return Customer.findOne({ email }).lean<ICustomer>().exec();
  },

  create(data: Partial<ICustomer>): Promise<ICustomer> {
    return Customer.create(data);
  },

  updateRutUsage(customer_id: string, amount: number, year: number): Promise<ICustomer | null> {
    return Customer.findOneAndUpdate(
      { customer_id },
      { $inc: { rut_used_ytd: amount }, rut_year: year, last_interaction_at: new Date() },
      { new: true },
    )
      .lean<ICustomer>()
      .exec();
  },
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const jobs = {
  findById(job_id: string): Promise<IJob | null> {
    return Job.findOne({ job_id }).lean<IJob>().exec();
  },

  find(filter: Partial<Pick<IJob, 'status' | 'customer_id' | 'provider_id'>>): Promise<IJob[]> {
    return Job.find(filter).lean<IJob[]>().exec();
  },

  create(data: Partial<IJob>): Promise<IJob> {
    return Job.create(data);
  },

  assign(job_id: string, provider_id: string): Promise<IJob | null> {
    return Job.findOneAndUpdate(
      { job_id },
      { provider_id, status: 'assigned' },
      { new: true },
    )
      .lean<IJob>()
      .exec();
  },

  complete(job_id: string, actual_hours: number, quality_rating: number): Promise<IJob | null> {
    return Job.findOneAndUpdate(
      { job_id },
      { status: 'completed', actual_hours, quality_rating, completed_at: new Date() },
      { new: true },
    )
      .lean<IJob>()
      .exec();
  },
};

// ─── Company Wiki ─────────────────────────────────────────────────────────────

export const companyWiki = {
  get(company_name: string, category: string, key: string): Promise<ICompanyWiki | null> {
    return CompanyWiki.findOne({ company_name, category, key }).lean<ICompanyWiki>().exec();
  },

  getAll(company_name: string): Promise<ICompanyWiki[]> {
    return CompanyWiki.find({ company_name }).lean<ICompanyWiki[]>().exec();
  },

  async set(
    company_name: string,
    category: string,
    key: string,
    value: unknown,
    updated_by: string,
  ): Promise<ICompanyWiki> {
    const existing = await CompanyWiki.findOne({ company_name, category, key });
    if (existing) {
      existing.previous_value = existing.value;
      existing.value = value;
      existing.version += 1;
      existing.updated_by = updated_by;
      existing.updated_at = new Date();
      return existing.save();
    }
    return CompanyWiki.create({ company_name, category, key, value, updated_by });
  },

  async getTyped<T>(company_name: string, category: string, key: string): Promise<T | null> {
    const doc = await CompanyWiki.findOne({ company_name, category, key }).lean<ICompanyWiki>().exec();
    return doc ? (doc.value as T) : null;
  },
};

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents = {
  create(data: Partial<IDocument>): Promise<IDocument> {
    return AnimaDocument.create(data);
  },

  findById(document_id: string): Promise<IDocument | null> {
    return AnimaDocument.findOne({ document_id }).lean<IDocument>().exec();
  },

  findByTags(tags: string[]): Promise<IDocument[]> {
    return AnimaDocument.find({ tags: { $in: tags } }).lean<IDocument[]>().exec();
  },
};

// ─── Escalations ──────────────────────────────────────────────────────────────

export const escalations = {
  create(data: Partial<IEscalation>): Promise<IEscalation> {
    return Escalation.create(data);
  },

  findPending(): Promise<IEscalation[]> {
    return Escalation.find({ status: 'pending' }).sort({ created_at: -1 }).lean<IEscalation[]>().exec();
  },

  decide(
    escalation_id: string,
    decision: 'approved' | 'rejected',
    decision_by: string,
    decision_reason: string,
  ): Promise<IEscalation | null> {
    return Escalation.findOneAndUpdate(
      { escalation_id },
      { status: decision, decision_by, decision_reason, decided_at: new Date() },
      { new: true },
    )
      .lean<IEscalation>()
      .exec();
  },
};

// ─── Quality Alerts ───────────────────────────────────────────────────────────

export const qualityAlerts = {
  create(data: Partial<IQualityAlert>): Promise<IQualityAlert> {
    return QualityAlert.create(data);
  },

  findUnresolved(agent?: string): Promise<IQualityAlert[]> {
    const filter = agent ? { agent, resolved: false } : { resolved: false };
    return QualityAlert.find(filter).lean<IQualityAlert[]>().exec();
  },

  resolve(alert_id: string): Promise<IQualityAlert | null> {
    return QualityAlert.findOneAndUpdate(
      { alert_id },
      { resolved: true, resolved_at: new Date() },
      { new: true },
    )
      .lean<IQualityAlert>()
      .exec();
  },
};

// ─── Quality Config ───────────────────────────────────────────────────────────

export const qualityConfig = {
  findByAgent(agent: IQualityConfig['agent']): Promise<IQualityConfig | null> {
    return QualityConfig.findOne({ agent }).lean<IQualityConfig>().exec();
  },

  async seedDefaults(): Promise<void> {
    for (const config of DEFAULT_QUALITY_CONFIGS) {
      await QualityConfig.updateOne({ agent: config.agent }, config, { upsert: true });
    }
  },

  update(
    agent: IQualityConfig['agent'],
    patch: Partial<IQualityConfig>,
  ): Promise<IQualityConfig | null> {
    return QualityConfig.findOneAndUpdate(
      { agent },
      { ...patch, updated_at: new Date() },
      { new: true },
    )
      .lean<IQualityConfig>()
      .exec();
  },
};

// ─── Named export as a single client object ───────────────────────────────────

export const WorldModelClient = {
  goals,
  tasks,
  agentDecisions,
  agentSessions,
  providers,
  capabilities,
  customers,
  jobs,
  companyWiki,
  documents,
  escalations,
  qualityAlerts,
  qualityConfig,
};
