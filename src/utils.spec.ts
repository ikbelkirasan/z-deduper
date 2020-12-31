import { generateKey, toFixedLengthChunks } from "./utils";

describe("Utils", () => {
  describe("generateKey", () => {
    it("should generate a UUID from a string", () => {
      const key = generateKey("zap_id_1");
      expect(key).toEqual("74a49e99-b72f-51ec-8aba-ae1a6e8d1ba9");
    });
  });

  describe("toFixedLengthChunks", () => {
    it("should split a string into an array of fixed-length chunks", () => {
      const input = "abcdefghijk";
      const chunks = toFixedLengthChunks(input, 4);
      expect(chunks).toEqual(["abcd", "efgh", "ijk"]);
    });
  });
});
