import _ from "lodash";
import axios, { AxiosInstance } from "axios";
import { generateKey, toFixedLengthChunks } from "./utils";
import { Page, Records } from "./interfaces";

export const ZAPIER_STORE_URL = "https://store.zapier.com";
export const MAX_KEY_SIZE = 24500;
export const MAX_KEYS = 495;

export class Storage {
  private key: string;
  private client: AxiosInstance;
  private MAX_KEY_SIZE = MAX_KEY_SIZE;
  private MAX_KEYS = MAX_KEYS;

  constructor(key: string) {
    this.key = key;
    this.client = axios.create({
      baseURL: ZAPIER_STORE_URL,
    });

    this.client.interceptors.response.use(undefined, (error) => {
      const errorMessage = error?.response?.data;
      if (errorMessage) {
        error.message = error.message + "\nReason: " + errorMessage.error;
      }
      throw error;
    });
  }

  public async load(): Promise<Records> {
    const firstPage = await this.fetchPage(0);
    let total = _.toFinite(firstPage.total);

    const pages: Page[] = [firstPage];
    if (total > 1) {
      // fetch next pages
      const promises = _.times(total - 1).map((i: number) => {
        return this.fetchPage(i + 1);
      });

      const results = await Promise.all(promises);
      pages.push(...results);
    }

    try {
      // Parse data
      let contents = _.flatMap(pages, (page) => page.records).join("");
      contents = Buffer.from(contents, "base64").toString();
      const records = JSON.parse(contents);
      return records;
    } catch (error:any) {
      error.message =
        "Deduper cache seems to be corrupted\nReason: " + error.message;
      throw error;
    }
  }

  private async fetchPage(page: number = 0): Promise<Page> {
    const response = await this.client.request({
      method: "GET",
      url: "/api/records",
      headers: {
        "X-Secret": generateKey(`${this.key}.${page}`),
      },
    });

    const data = response.data;

    if (!data.__zapier_custom_deduper__) {
      throw new Error(
        "Invalid page. The UUID key might be used by something else.",
      );
    }

    const records = Object.keys(response.data)
      .filter((key) => key.startsWith("records."))
      .reduce((prev, current) => {
        const records = response.data[current];
        return prev.concat(records);
      }, []);

    return {
      records,
      total: data.total,
    };
  }

  public async save(records: Records) {
    // Encode data
    const contents = Buffer.from(JSON.stringify(records)).toString("base64");
    const lines = toFixedLengthChunks(contents, this.MAX_KEY_SIZE);
    const parts = _.chunk(lines, this.MAX_KEYS);

    let i = 0;
    const pages = parts.map((part: string[], p: number) => {
      const page = part.reduce((prev: any, current: string) => {
        prev[`records.${i++}`] = current;
        return prev;
      }, {});
      page.total = parts.length;
      page.__zapier_custom_deduper__ = true;
      page.page = p;
      return page;
    });

    // Save data
    const promises = pages.map((data, page) => this.savePage(page, data));
    return Promise.all(promises);
  }

  private async savePage(page: number, data: any) {
    const response = await this.client.request({
      method: "POST",
      url: "/api/records",
      data,
      headers: {
        "X-Secret": generateKey(`${this.key}.${page}`),
      },
    });
    return response.data;
  }
}
