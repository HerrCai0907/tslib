import { createHash } from "crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

type Input = string | Buffer;
type Output = Buffer | string | ((outputFile: string) => void);
const defaultHash = (data: Input) => {
  const hash = createHash("md5");
  hash.update(data);
  return hash.digest("hex");
};

export class CacheArea {
  private cacheFolder_: string;
  constructor(cacheFolder: string) {
    this.cacheFolder_ = cacheFolder;
  }

  getCachedFilePath(id: string): string {
    const filePath = join(this.cacheFolder_, id.toLowerCase());
    return filePath;
  }
  /**
   * load data from cache area
   * @param id identification of cached data
   * @returns if exist, return data, otherwise return null
   */
  loadData(id: string): string | null {
    const path = this.getCachedFilePath(id);
    if (existsSync(path)) {
      return readFileSync(path, { encoding: "utf8" });
    } else {
      return null;
    }
  }
  /**
   * store data to cache area
   * @param id identification of cached data
   * @param data
   * @returns data stored path
   */
  storeData(id: string, data: string): string {
    const path = this.getCachedFilePath(id);
    writeFileSync(path, data);
    return path;
  }

  /**
   * load data
   * @param id identification
   * @param input input data, will be hashed
   * @param hash hash function, default is md5
   * @returns store data
   */
  loadCachedHashData(
    id: string,
    input: Input,
    hash: (data: Input) => string = defaultHash
  ): Buffer | null {
    const hashFilePath = this.getCachedFilePath(id + ".hash");
    const outFilePath = this.getCachedFilePath(id);
    if (!existsSync(hashFilePath) || !existsSync(outFilePath)) {
      return null;
    }
    const cachedHashValue = readFileSync(hashFilePath, { encoding: "utf-8" });
    const hashValue = hash(input);
    if (cachedHashValue !== hashValue) {
      return null;
    }
    return readFileSync(outFilePath);
  }

  /**
   * store data
   * @param id identification
   * @param input input data, will be hashed
   * @param output output data, will be cached
   * @param hash hash function, default is md5
   * @returns data stored path
   */
  storeCachedHashData(
    id: string,
    input: Input,
    output: Output,
    hash: (data: Input) => string = defaultHash
  ): string {
    const hashValue = hash(input);
    const hashFilePath = this.getCachedFilePath(id + ".hash");
    const outFilePath = this.getCachedFilePath(id);
    rmSync(hashFilePath);
    rmSync(outFilePath);
    if (typeof output === "function") {
      output(outFilePath);
    } else {
      writeFileSync(outFilePath, output);
    }
    writeFileSync(hashFilePath, hashValue, { encoding: "utf8" });
    return outFilePath;
  }
}
