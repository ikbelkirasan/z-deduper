import nock from "nock";
import { Storage, ZAPIER_STORE_URL } from "./storage";
import { generateKey } from "./utils";

const ZAP_ID = "12345";

function mock(zapId: string = ZAP_ID) {
  const scope = nock(ZAPIER_STORE_URL);
  return {
    getRecords(page: number) {
      return scope
        .get("/api/records")
        .matchHeader("X-Secret", generateKey(`${zapId}.${page}`));
    },
    postRecords(page: number, data: any) {
      return scope
        .post("/api/records", data)
        .matchHeader("X-Secret", generateKey(`${zapId}.${page}`));
    },
  };
}

describe("Storage", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  it("should be defined", () => {
    expect(Storage).toBeDefined();
  });

  it("should load all records from storage", async () => {
    mock().getRecords(0).reply(200, {
      __zapier_custom_deduper__: true,
      "records.0": "eyJyZWMxIjoiZm9vIiw",
      "records.1": "icmVjMiI6ImJhciIsIn",
      total: 2,
    });

    mock().getRecords(1).reply(200, {
      __zapier_custom_deduper__: true,
      "records.2": "JlYzMiOiJiYXoifQ==",
    });

    const response = await new Storage(ZAP_ID).load();

    expect(response).toEqual({
      rec1: "foo",
      rec2: "bar",
      rec3: "baz",
    });
  });

  it("should save all records to storage", async () => {
    const data = [
      {
        __zapier_custom_deduper__: true,
        "records.0": "eyJyZWMxIjoiZm9vIiw",
        "records.1": "icmVjMiI6ImJhciIsIn",
        page: 0,
        total: 2,
      },
      {
        __zapier_custom_deduper__: true,
        "records.2": "JlYzMiOiJiYXoifQ==",
        page: 1,
        total: 2,
      },
    ];
    mock().postRecords(0, data[0]).reply(200, data[0]);
    mock().postRecords(1, data[1]).reply(200, data[1]);

    const storage = new Storage(ZAP_ID);

    //@ts-ignore
    storage.MAX_KEY_SIZE = 19;
    //@ts-ignore
    storage.MAX_KEYS = 2;

    const records = {
      rec1: "foo",
      rec2: "bar",
      rec3: "baz",
    };
    const response = await storage.save(records);

    expect(response).toEqual(data);
  });
});
