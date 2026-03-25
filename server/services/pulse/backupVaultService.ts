import { db } from '../../db';
import { sql } from 'drizzle-orm';

const SYNC_TABLES = [
  'prediction_events',
  'prediction_outcomes', 
  'prediction_accuracy_stats',
  'strikeagent_predictions',
  'strikeagent_outcomes',
  'strike_agent_signals',
] as const;

class BackupVaultService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  async syncToBackup(tableName: string): Promise<number> {
    try {
      const result = await db.execute(sql.raw(`
        INSERT INTO backup_vault.${tableName} 
        SELECT src.*, NOW() as synced_at 
        FROM ${tableName} src
        WHERE NOT EXISTS (
          SELECT 1 FROM backup_vault.${tableName} bv WHERE bv.id = src.id
        )
      `));
      const count = (result as any)?.rowCount || 0;
      if (count > 0) {
        console.log(`[BackupVault] Synced ${count} new rows to backup_vault.${tableName}`);
      }
      return count;
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        await this.recreateBackupTable(tableName);
        return 0;
      }
      console.error(`[BackupVault] Sync error for ${tableName}:`, error.message);
      return 0;
    }
  }

  async syncAll(): Promise<{ total: number; byTable: Record<string, number> }> {
    const byTable: Record<string, number> = {};
    let total = 0;
    for (const table of SYNC_TABLES) {
      const count = await this.syncToBackup(table);
      byTable[table] = count;
      total += count;
    }
    return { total, byTable };
  }

  async restoreFromBackup(tableName: string): Promise<number> {
    try {
      const mainCount = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM ${tableName}`));
      const backupCount = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM backup_vault.${tableName}`));
      const mainRows = parseInt((mainCount as any).rows?.[0]?.cnt || '0');
      const backupRows = parseInt((backupCount as any).rows?.[0]?.cnt || '0');

      if (backupRows > mainRows) {
        console.log(`[BackupVault] RESTORE NEEDED: ${tableName} has ${mainRows} rows, backup has ${backupRows}`);
        const cols = await this.getColumnNames(tableName);
        const colList = cols.join(', ');
        const result = await db.execute(sql.raw(`
          INSERT INTO ${tableName} (${colList})
          SELECT ${colList} FROM backup_vault.${tableName} bv
          WHERE NOT EXISTS (
            SELECT 1 FROM ${tableName} m WHERE m.id = bv.id
          )
        `));
        const restored = (result as any)?.rowCount || 0;
        console.log(`[BackupVault] RESTORED ${restored} rows to ${tableName} from backup`);
        return restored;
      }
      return 0;
    } catch (error: any) {
      console.error(`[BackupVault] Restore error for ${tableName}:`, error.message);
      return 0;
    }
  }

  async restoreAll(): Promise<{ total: number; byTable: Record<string, number> }> {
    const byTable: Record<string, number> = {};
    let total = 0;
    for (const table of SYNC_TABLES) {
      const count = await this.restoreFromBackup(table);
      byTable[table] = count;
      total += count;
    }
    if (total > 0) {
      console.log(`[BackupVault] TOTAL RESTORED: ${total} rows across all tables`);
    }
    return { total, byTable };
  }

  async checkAndAutoRestore(): Promise<void> {
    for (const table of SYNC_TABLES) {
      try {
        const mainCount = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM ${table}`));
        const backupCount = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM backup_vault.${table}`));
        const mainRows = parseInt((mainCount as any).rows?.[0]?.cnt || '0');
        const backupRows = parseInt((backupCount as any).rows?.[0]?.cnt || '0');

        if (backupRows > 0 && mainRows === 0) {
          console.log(`[BackupVault] AUTO-RESTORE: ${table} is EMPTY but backup has ${backupRows} rows!`);
          await this.restoreFromBackup(table);
        } else if (backupRows > mainRows * 2) {
          console.log(`[BackupVault] WARNING: ${table} has ${mainRows} rows but backup has ${backupRows} - possible data loss`);
          await this.restoreFromBackup(table);
        }
      } catch (error: any) {
        if (error.message?.includes('does not exist')) {
          console.log(`[BackupVault] Table ${table} doesn't exist yet, skipping auto-restore`);
        }
      }
    }
  }

  async getStats(): Promise<Record<string, { main: number; backup: number }>> {
    const stats: Record<string, { main: number; backup: number }> = {};
    for (const table of SYNC_TABLES) {
      try {
        const mainCount = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM ${table}`));
        const backupCount = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM backup_vault.${table}`));
        stats[table] = {
          main: parseInt((mainCount as any).rows?.[0]?.cnt || '0'),
          backup: parseInt((backupCount as any).rows?.[0]?.cnt || '0'),
        };
      } catch {
        stats[table] = { main: 0, backup: 0 };
      }
    }
    return stats;
  }

  private async getColumnNames(tableName: string): Promise<string[]> {
    const result = await db.execute(sql.raw(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = '${tableName}' 
      ORDER BY ordinal_position
    `));
    return (result as any).rows.map((r: any) => r.column_name);
  }

  private async recreateBackupTable(tableName: string): Promise<void> {
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS backup_vault.${tableName} AS 
        SELECT *, NOW() as synced_at FROM ${tableName} WHERE FALSE
      `));
      await db.execute(sql.raw(`
        ALTER TABLE backup_vault.${tableName} ADD PRIMARY KEY (id)
      `));
      console.log(`[BackupVault] Recreated backup table: backup_vault.${tableName}`);
    } catch (error: any) {
      console.error(`[BackupVault] Failed to recreate backup table ${tableName}:`, error.message);
    }
  }

  startAutoSync(intervalMs: number = 60_000): void {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`[BackupVault] Starting auto-sync every ${intervalMs / 1000}s`);

    this.checkAndAutoRestore().catch(err => 
      console.error('[BackupVault] Initial auto-restore check failed:', err.message)
    );

    this.syncInterval = setInterval(async () => {
      try {
        await this.syncAll();
      } catch (error: any) {
        console.error('[BackupVault] Auto-sync error:', error.message);
      }
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('[BackupVault] Auto-sync stopped');
  }
}

export const backupVaultService = new BackupVaultService();
