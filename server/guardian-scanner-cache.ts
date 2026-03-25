interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class GuardianScannerCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startCleanupInterval();
  }
  
  private startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const entries = Array.from(this.cache.entries());
      for (const [key, entry] of entries) {
        if (entry.expiresAt < now) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000);
  }
  
  set<T>(key: string, data: T, ttlMs: number = 30000): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  invalidate(key: string): void {
    this.cache.delete(key);
  }
  
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const tokenDataCache = new GuardianScannerCache();
export const commentCache = new GuardianScannerCache();
export const alertCache = new GuardianScannerCache();

export const CACHE_TTL = {
  TOKEN_LIST: 30 * 1000,
  TOKEN_DETAIL: 15 * 1000,
  COMMENTS: 60 * 1000,
  USER_ALERTS: 5 * 60 * 1000,
  CREATOR_HISTORY: 5 * 60 * 1000
};
