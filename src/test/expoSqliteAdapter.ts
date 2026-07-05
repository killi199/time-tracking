import { DatabaseSync } from 'node:sqlite'

/**
 * In-memory stand-in for expo-sqlite backed by node:sqlite, implementing
 * exactly the API surface used by src/db/database.ts. Used via
 * `vi.mock('expo-sqlite', () => import('../test/expoSqliteAdapter'))` so the
 * database module runs its real SQL against a real (in-memory) SQLite.
 */

type BindParams = Record<string, string | number | null>

class MockSQLiteDatabase {
    private readonly db = new DatabaseSync(':memory:')

    execSync(sql: string): void {
        this.db.exec(sql)
    }

    getAllSync<T>(sql: string, params?: BindParams): T[] {
        const statement = this.db.prepare(sql)
        const rows =
            params === undefined ? statement.all() : statement.all(params)
        return rows as T[]
    }

    prepareSync(sql: string) {
        const statement = this.db.prepare(sql)
        return {
            executeSync(params?: BindParams) {
                const result =
                    params === undefined
                        ? statement.run()
                        : statement.run(params)
                return {
                    lastInsertRowId: Number(result.lastInsertRowid),
                    changes: Number(result.changes),
                }
            },
            finalizeSync() {
                // node:sqlite statements are released by GC; nothing to do
            },
        }
    }

    withTransactionSync(fn: () => void): void {
        this.db.exec('BEGIN')
        try {
            fn()
            this.db.exec('COMMIT')
        } catch (error) {
            this.db.exec('ROLLBACK')
            throw error
        }
    }
}

export const openDatabaseSync = () => new MockSQLiteDatabase()
