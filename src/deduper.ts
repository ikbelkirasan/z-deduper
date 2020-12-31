import _ from "lodash";
import hash from "object-hash";
import { DeduperChanges, PollRecord, Records } from "./interfaces";
import { Storage } from "./storage";

export class Deduper {
  private storage: Storage;
  private changes?: DeduperChanges;
  private cache?: Records;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  public async findChanges(
    currentRecords: PollRecord[],
    forceReload?: boolean,
  ): Promise<DeduperChanges> {
    if (_.isUndefined(this.cache) || forceReload) {
      this.cache = await this.storage.load();
    }

    const changes: DeduperChanges = {
      created: [],
      updated: [],
      all: [],
    };

    for (const record of currentRecords) {
      const recordHash = this.hash(record);

      const cachedRecordHash = this.cache[record.id];
      if (cachedRecordHash) {
        if (recordHash !== cachedRecordHash) {
          // This is an updated record
          // TODO: support comparing a subset of fields only
          changes.updated.push({
            id: record.id,
            hash: recordHash,
          });
        }
      } else {
        // This is a new record
        changes.created.push({
          id: record.id,
          hash: recordHash,
        });
      }
    }

    changes.all = [...changes.created, ...changes.updated];

    // cache the changes
    this.changes = changes;

    return this.changes;
  }

  public async persistChanges(records: Records) {
    const data = _.merge({}, this.cache, records);
    await this.storage.save(data);
    return true;
  }

  private hash(record: any) {
    return hash(record, {
      algorithm: "md5",
      encoding: "base64",
    });
  }
}

export function getDeduper(zapId: string): Deduper {
  const storage = new Storage(zapId);
  const deduper = new Deduper(storage);
  return deduper;
}
