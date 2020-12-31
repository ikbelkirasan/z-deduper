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
          "1": "some_hash_here",
        };
      },
    };
    const deduper = new Deduper(fakeStorage as any);

    const changes = await deduper.findChanges([
      { id: 1, foo: "bar" },
      { id: 2 },
    ]);

    const created = [
      {
        id: 2,
        hash: expect.any(String),
      },
    ];

    const updated = [
      {
        id: 1,
        hash: expect.any(String),
      },
    ];

    expect(changes).toEqual({
      all: [...created, ...updated],
      created,
      updated,
    });
  });

  it("should not reload the cache if it's already populated", async () => {
    const fakeStorage = {
      load: jest.fn().mockImplementation(() => []),
    };
    const deduper = new Deduper(fakeStorage as any);

    //@ts-ignore
    deduper.cache = new Map();
    await deduper.findChanges([]);
    expect(fakeStorage.load).not.toHaveBeenCalled();

    // Force reload cache
    await deduper.findChanges([], true);
    expect(fakeStorage.load).toHaveBeenCalledTimes(1);
  });

  it("should persist changes", async () => {
    const fakeStorage = {
      save: jest.fn(),
    };
    const deduper = new Deduper(fakeStorage as any);

    //@ts-ignore
    deduper.cache = {
      foo: "bar",
    };
    await deduper.persistChanges({});
    expect(fakeStorage.save).toHaveBeenCalledWith({
      foo: "bar",
    });
  });
});
