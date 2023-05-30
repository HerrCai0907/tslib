import assert from "assert";
import { cpus } from "os";
import { Worker } from "worker_threads";
import { sleep } from "./common";

enum Status {
  free,
  locked,
  crashed,
}

interface WorkerStatus {
  worker: Worker;
  status: Status;
}

export class WorkerPool {
  private maxWorker: number;
  private map = new Map<number, WorkerStatus>();
  private workerFilename: string;

  constructor(workerFilename: string, maxWorker?: number) {
    this.workerFilename = workerFilename;
    if (maxWorker != undefined) {
      this.maxWorker = maxWorker;
    } else {
      this.maxWorker = cpus().length > 1 ? cpus().length : 1;
    }
    for (let i = 0; i < this.maxWorker; i++) {
      this.map.set(i, this.createNewWorker());
    }
  }

  private createNewWorker(): WorkerStatus {
    const worker = new Worker(this.workerFilename);
    const ret = { worker: worker, status: Status.free };
    worker.on("exit", (exitCode) => {
      if (exitCode != 0) {
        ret.status = Status.crashed;
      }
    });
    return ret;
  }

  async getWorker(): Promise<{ key: number; worker: Worker }> {
    while (true) {
      for (const [key, v] of this.map) {
        if (v.status === Status.free) {
          v.status = Status.locked;
          return { key: key, worker: v.worker };
        }
      }
      await sleep(100);
    }
  }

  releaseWorker(key: number) {
    const value = this.map.get(key);
    assert(value);
    if (value.status === Status.crashed) {
      this.map.set(key, this.createNewWorker());
    } else {
      value.status = Status.free;
    }
  }

  resetWorker(key: number): Worker {
    const newWorker = this.createNewWorker();
    this.map.set(key, newWorker);
    return newWorker.worker;
  }
}
