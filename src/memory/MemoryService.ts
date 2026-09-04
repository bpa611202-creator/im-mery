import {
  MemoryItem,
  MemoryType,
  MemoryStatus,
  MemoryContextResult,
  MemoryStats,
  MemoryCandidate,
} from './memoryTypes';

type MemoryChangeListener = () => void;

export class MemoryService {
  private listeners: Set<MemoryChangeListener> = new Set();

  public subscribe(listener: MemoryChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn('[MemoryService] Listener notice:', err);
      }
    });
  }

  public async list(filter?: {
    type?: MemoryType;
    category?: string;
    status?: MemoryStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<MemoryItem[]> {
    const params = new URLSearchParams();
    if (filter?.type) params.set('type', filter.type);
    if (filter?.category) params.set('category', filter.category);
    if (filter?.status) params.set('status', filter.status);
    if (filter?.search) params.set('search', filter.search);
    if (filter?.limit) params.set('limit', filter.limit.toString());
    if (filter?.offset) params.set('offset', filter.offset.toString());

    const res = await fetch(`/api/memory?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to load memories: ${res.statusText}`);
    }
    const data = await res.json();
    return data.memories || [];
  }

  public async save(data: {
    text?: string;
    type?: MemoryType;
    category?: string;
    key?: string;
    value?: string;
    importance?: number;
  }): Promise<{ status: string; actionResult: string }> {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(`Failed to save memory: ${res.statusText}`);
    }
    const json = await res.json();
    this.notify();
    return json;
  }

  public async update(id: string, updates: Partial<MemoryItem>): Promise<boolean> {
    const res = await fetch(`/api/memory/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const json = await res.json();
    this.notify();
    return json.status === 'ok';
  }

  public async delete(id: string): Promise<boolean> {
    const res = await fetch(`/api/memory/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    this.notify();
    return json.status === 'ok';
  }

  public async deleteCategory(category: string): Promise<number> {
    const res = await fetch(`/api/memory/category/${encodeURIComponent(category)}`, {
      method: 'DELETE',
    });
    const json = await res.json();
    this.notify();
    return json.count || 0;
  }

  public async clearAll(): Promise<boolean> {
    const res = await fetch('/api/memory', {
      method: 'DELETE',
    });
    const json = await res.json();
    this.notify();
    return json.status === 'ok';
  }

  public async retrieve(
    text: string,
    options?: { limit?: number; threshold?: number; types?: MemoryType[] }
  ): Promise<MemoryContextResult> {
    const res = await fetch('/api/memory/retrieve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        limit: options?.limit,
        threshold: options?.threshold,
        types: options?.types,
      }),
    });
    if (!res.ok) {
      throw new Error('Retrieval failed');
    }
    return res.json();
  }

  public async extract(
    text: string,
    modelReply?: string
  ): Promise<{ candidates: MemoryCandidate[]; actionResults: string[] }> {
    const res = await fetch('/api/memory/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, modelReply }),
    });
    return res.json();
  }

  public async getStats(): Promise<MemoryStats> {
    const res = await fetch('/api/memory/stats');
    if (!res.ok) {
      throw new Error('Failed to get memory stats');
    }
    return res.json();
  }

  public exportData(): void {
    window.location.href = '/api/memory/export';
  }
}

export const memoryService = new MemoryService();
