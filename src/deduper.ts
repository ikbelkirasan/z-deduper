import _ from "lodash";
import hash from "object-hash";
import { DeduperChanges, PollRecord, Records } from "./interfaces";
import { Storage } from "./storage";

export class Deduper {
  private storage: Storage;
  private changes?: DeduperChanges;
  private cache: Records = {};

  constructor(storage: Storage) {
    this.storage = storage;
  }

  /**
   * Initialize the deduper
   *
   * Note: Should only be called once when the zap is activated
   */
  public async initialize(currentRecords: PollRecord[]) {
    const records = this.getRecords(currentRecords);
    await this.storage.save(records);
    return true;
  }

  public async load() {
    this.cache = await this.storage.load();
    return true;
  }

  /**
   * Find changes
   *
   * Compares the current records with the cached record hashes to find
   * which records are new and which are updated.
   */
  public findChanges(currentRecords: PollRecord[]): DeduperChanges {
    const changes: DeduperChanges = {
      created: [],
      updated: [],
      all: [],
    };

    const timestamp = this.getTimestamp();

    for (const record of currentRecords) {
      const recordHash = this.hash(record);

      const cachedRecordHash = this.cache[record.id];
      if (cachedRecordHash) {
        if (recordHash !== cachedRecordHash) {
          // This is an updated record
          changes.updated.push({
            ...record,
            id: `${record.id}.${timestamp}`,
            _id: record.id,
            _hash: recordHash,
          });
        }
      } else {
        // This is a new record
        changes.created.push({
          ...record,
          id: `${record.id}.${timestamp}`,
          _id: record.id,
          _hash: recordHash,
        });
      }
    }

    changes.all = [...changes.created, ...changes.updated];

    // cache the changes
    this.changes = changes;

    return this.changes;
  }

  private getTimestamp() {
    return new Date().getTime();
  }

  /**
   * Save to the cache
   *
   * Note: Should be called after each poll to update the deduper cache.
   *
   */
  public async persistChanges(currentRecords: PollRecord[]) {
    const records = this.getRecords(currentRecords);
    const data = _.merge({}, this.cache, records);
    await this.storage.save(data);
    return true;
  }

  /**
   * Hash a record
   */
  private hash(record: PollRecord) {
    return hash(record, {
      algorithm: "md5",
      encoding: "base64",
    });
  }

  /**
   * Convert records into cache records
   *
   */
  private getRecords(currentRecords: PollRecord[]) {
    const records = _.reduce(
      currentRecords,
      (records: Records, record) => {
        records[record.id] = this.hash(record);
        return records;
      },
      {},
    );
    return records;
  }
}

/**
 * Get a deduper instance
 *
 * @param zapId Zap ID
 */
export function getDeduper(zapId: string): Deduper {
  const storage = new Storage(zapId);
  const deduper = new Deduper(storage);
  return deduper;
}
