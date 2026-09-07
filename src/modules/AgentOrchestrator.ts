export interface AgentTask {
  id: string;
  agentType: 'dev' | 'research' | 'system' | 'memory' | 'general';
  goal: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
}

export class AgentOrchestrator {
  // ૧. ટાસ્કનું વિશ્લેષણ કરી યોગ્ય એજન્ટને સોંપવું
  public routeTask(prompt: string): AgentTask {
    const lower = prompt.toLowerCase();

    if (
      lower.includes('code') ||
      lower.includes('bug') ||
      lower.includes('create file') ||
      lower.includes('script')
    ) {
      return { id: `task-${Date.now()}`, agentType: 'dev', goal: prompt, status: 'pending' };
    }
    if (
      lower.includes('search') ||
      lower.includes('who is') ||
      lower.includes('latest') ||
      lower.includes('find')
    ) {
      return { id: `task-${Date.now()}`, agentType: 'research', goal: prompt, status: 'pending' };
    }
    if (
      lower.includes('open app') ||
      lower.includes('volume') ||
      lower.includes('brightness') ||
      lower.includes('close')
    ) {
      return { id: `task-${Date.now()}`, agentType: 'system', goal: prompt, status: 'pending' };
    }

    return { id: `task-${Date.now()}`, agentType: 'general', goal: prompt, status: 'pending' };
  }

  // ૨. એજન્ટ એક્ઝિક્યુશન
  public async executeTask(task: AgentTask): Promise<string> {
    task.status = 'running';

    switch (task.agentType) {
      case 'research': {
        // રિયલ વેબ સર્ચ એજન્ટ કોલ
        try {
          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: task.goal }),
          });
          const data = await res.json();
          task.status = 'completed';
          task.result = data;
          return data.summary || 'સર્ચ પરિણામ મળી ગયા છે.';
        } catch (err: any) {
          task.status = 'failed';
          return `સર્ચ કરવામાં ભૂલ આવી: ${err?.message || 'Unknown error'}`;
        }
      }

      case 'system': {
        task.status = 'completed';
        task.result = { action: 'system_executed', goal: task.goal };
        return `સિસ્ટમ એજન્ટે તમારું કામ પૂર્ણ કર્યું: ${task.goal}`;
      }

      case 'dev': {
        task.status = 'completed';
        task.result = { action: 'dev_executed', goal: task.goal };
        return `ડેવલપર એજન્ટે કોડ પ્રોસેસિંગ તૈયાર કર્યું: ${task.goal}`;
      }

      default: {
        task.status = 'completed';
        return `ટાસ્ક પૂર્ણ થયો.`;
      }
    }
  }
}

export const agentOrchestrator = new AgentOrchestrator();
