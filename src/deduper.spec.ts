import { Deduper, getDeduper } from "./deduper";
import nock from "nock";

describe("Deduper", () => {
  beforeEach(() => {
    nock.disableNetConnect();
  });

  it("should be defined", () => {
    expect(Deduper).toBeDefined();
  });

  it("should return a deduper instance", async () => {
    const deduper = getDeduper("12345");
    expect(deduper).toBeInstanceOf(Deduper);
  });

  it("detect changes", async () => {
    const fakeStorage = {
      async load() {
        return {
          1: "an_old_fake_hash",
        };
      },
    };
    const deduper = new Deduper(fakeStorage as any);
    await deduper.load();

    //@ts-ignore
    deduper.getTimestamp = () => "fake_timestamp";

    //@ts-ignore
    deduper.hash = () => "fake_hash";

    const changes = await deduper.findChanges([
      { id: 1, foo: "bar" },
      { id: 2 },
    ]);

    const created = [
      {
        id: "2.fake_timestamp",
        _id: 2,
        _hash: "fake_hash",
      },
    ];

    const updated = [
      {
        id: "1.fake_timestamp",
        foo: "bar",
        _id: 1,
        _hash: "fake_hash",
      },
    ];

    expect(changes).toEqual({
      all: [...created, ...updated],
      created,
      updated,
    });
  });

  it("should persist changes", async () => {
    const fakeStorage = {
      save: jest.fn(),
    };
    const deduper = new Deduper(fakeStorage as any);

    //@ts-ignore
    deduper.cache = {
      item1: "YtgnKwYsbpXJZwGO2ZUBQQ==",
    };
    await deduper.persistChanges([
      {
        id: "item1",
        name: "foo",
      },
      {
        id: "item2",
        name: "bar",
      },
    ]);
    expect(fakeStorage.save).toHaveBeenCalledWith({
      item1: "5LkFSjD3MWK7bOMeo1f5xg==",
      item2: "OWD/UUTp9eoycPHl+01Q3Q==",
    });
  });

  it("should initialize the deduper", async () => {
    const fakeStorage = {
      save: jest.fn(),
    };
    const deduper = new Deduper(fakeStorage as any);
    await deduper.initialize([
      {
        id: "item1",
        name: "foo",
      },
    ]);

    expect(fakeStorage.save).toHaveBeenCalledWith({
      item1: "5LkFSjD3MWK7bOMeo1f5xg==",
    });
  });
});
