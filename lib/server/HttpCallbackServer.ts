import tunnels from '../tunnels';

import * as env from "../../env";
import { processRequest } from "../process";
import { configureSemaphore } from "../configure-semaphore";
import { setInFlight } from "../tracking";

import { Server } from "http";

import { initExpress } from "./express";
import { Application } from "express";
import { HttpCallbackProcessor, websemaphoreClient } from "../shared";

export class HttpCallbackServer {
  app: Application;
  httpServer?: Server; //ReturnType<typeof express>;
  _processor: HttpCallbackProcessor = processRequest;

  autotest: boolean = true;

  callbackUrl: string = "";
  tunnel?: Awaited<ReturnType<typeof tunnels["ngrok"]>>;

  console: typeof console = global.console;


  constructor(autotest?: boolean | HttpCallbackProcessor, opts?: { console?: typeof console }) {
    this.app = initExpress(this.processorFactory(), { console: this.console });

    if (typeof autotest == "function") {
      this._processor = autotest.bind(this);
    } else if (typeof autotest == "boolean") {
      this.autotest = autotest;
    } else
    if(autotest != undefined)
      throw new Error("Invalid processor/autotest parameter");

    opts?.console && (this.console = opts.console);

    this.console.log("INITIALIZING CALLBACK SERVER \n\n\n\n");
  }

  // async requestSemaphor(message?: any) {
  //   const msg = { channelId: "default", message: message || "hello semaphore", id: `${Date.now()}${Math.random()}`.replace(/\./g, "-") };
  //   const resp = await websemaphoreClient.semaphore.acquire(env.SEMAPHORE_ID, msg as any);

  //   setInFlight(msg);

  //   console.log("Semaphore requested", (resp as any).status, (resp as any).statusText);

  //   this.app = initExpress(this.processorFactory());

  //   return resp;
  // }

  private processorFactory() {
    const instance = this;
    return async ({ message, jobCrn }: { message: any, jobCrn: string; }) => {
      // console.log("HttpCallbackServer processor", message, jobCrn);
      debugger;
      return await instance._processor({ message, jobCrn });
    }
  }

  async restart() {
    this.tunnel = await this.tunnel?.restart();
    this.callbackUrl = `${this.tunnel?.host}/processor`;

    await configureSemaphore(this.callbackUrl)
  }

  async stop() {
    this.console.log("Stopping HttpCallbackServer");
    this.tunnel?.stop()
    this.console.log("Stopping Express");
    this.httpServer?.close();
  }

  setProcessor(processor: HttpCallbackProcessor) {
    this._processor = processor.bind(this);
  }

  async start() {
    const tunnel = await tunnels[env.TUNNELING_PROVIDER](env.HTTP_PORT);
    this.tunnel = tunnel;

    this.httpServer = this.app.listen(env.HTTP_PORT);
    this.callbackUrl = `${tunnel.host}/processor`;

    this.console.log("connected, configuring semaphore...");

    await configureSemaphore(this.callbackUrl)

    return this;
  };
}

const test = async () => {
  const server = await new HttpCallbackServer().start();
  console.log("Waiting...");
  await new Promise(r => setTimeout(r, 5000))
  console.log("Restarting...");
  await server.restart();
}

if (require.main === module)
  test();
