import { Database } from 'sqlite3'

import { RowNotFoundError } from '../../errors/row-not-found-error'
import { Connection, QueryResult, Row, TransactionHandler } from '../../interfaces/database'

export class Sqlite3Connection implements Connection {

  public constructor(public connection: Database) {
  }

  public close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.close((err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      })
    })
  }

  public first<TRow extends Row>(query: string, values: any[] = []): Promise<TRow> {
    return new Promise<TRow>((resolve, reject) => {
      this.connection.get(query, values || [], (err, row) => {
        if (err) {
          return reject(err)
        }
        if (!row) {
          return reject(new RowNotFoundError())
        }
        resolve(row)
      })
    })
  }

  public select<TRow extends Row>(query: string, values: any[] = []): Promise<TRow[]> {
    return new Promise<TRow[]>((resolve, reject) => {
      this.connection.all(query, values || [], (err, rows) => {
        if (err) {
          return reject(err)
        }
        resolve(rows)
      })
    })
  }

  public query(query: string, values: any[] = []): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.connection.run(query, values || [], function (err: Error|null): void {
        if (err) {
          return reject(err)
        }
        resolve({
          insertId: /^insert/i.test(query) ? this.lastID : undefined, // eslint-disable-line no-invalid-this
          changes: this.changes, // eslint-disable-line no-invalid-this
          raw: this, // eslint-disable-line no-invalid-this
        })
      })
    })
  }

  public async transaction<TResult>(handler: TransactionHandler<TResult>): Promise<TResult> {
    await this.query('BEGIN TRANSACTION')
    try {
      const result = await handler(this)
      await this.query('COMMIT')
      return result
    } catch (e) {
      await this.query('ROLLBACK')
      throw e
    }
  }
}
