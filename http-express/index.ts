import { WebSemaphoreHttpClientManager } from "websemaphore";
import tunnels from './lib/tunnels';
import { readFileSync } from 'fs';
import express from 'express';
import { Request, Response } from 'express';

// import fetch from "node-fetch";
import * as env from "../env";
import { processRequest } from "./lib/process";
import { configureSemaphore } from "./lib/configure-semaphore";
import { setInFlight, stats } from "./lib/tracking";

debugger;

// const l = console.log;
// console.log = (...args) => {
//   l(new Error().stack, ...args);
// }

const _fetch: typeof fetch = async (url: RequestInfo | URL, opts?: RequestInit) => {
  const res = await fetch(url, opts);

  console.log("*".repeat(10), url)
  console.log(url)
  console.log(JSON.stringify(opts?.headers))
  console.log("body:", JSON.stringify(opts?.body));
  console.log("res:", await res.text())
  console.log("res headers:\n", Array.from(res.headers.entries()).join("\n"));
  console.log("*".repeat(10))
  // console.log("Headers:", res.headers);

  debugger;
  // if((url as string).endsWith("semaphore")) {
  //   console.log(res.headers)
  //   console.log(url, opts);
  //   console.log(res.status, res.statusText);
  //   console.log(await res.text());
  //   // process.exit();
  // }
  return res as any as ReturnType<typeof fetch>;
};

// const _fetch = cf;

const websemaphoreManager = WebSemaphoreHttpClientManager({ logLevel: env.LOG_LEVEL, token: env.APIKEY, fetch: _fetch });
const websemaphoreClient = websemaphoreManager.initialize({ fetch: _fetch, baseUrl: "us-dev" }); //"https://us-dev.websemaphore.com" });

websemaphoreClient.setSecurityData({ token: env.APIKEY })

export const httpCallbackServer = async (autotest?: boolean | typeof processRequest) => {
  const app: express.Application = express();

  const _orig = console.log.bind(console);
  const log = [] as string[];


  console.log = (...args) => {
    _orig(...args);
    log.unshift(new Date().toISOString() + " " + ((args || []) as any[]).join(" "));
  }

  const PORT = env.HTTP_PORT;
  const SEMAPHORE_ID = env.SEMAPHORE_ID;

  if (!env.APIKEY) {
    console.error("API Key is not set. Configure in env.ts; read more at https://www.websemaphore.com/docs/v1/setup/key");
    process.exit();
  }

  const requestSemaphore = async (message?: any) => {
    const msg = { channelId: "default", message: message || "hello semaphore", id: `${Date.now()}${Math.random()}`.replace(/\./g, "-") };
    const resp = await websemaphoreClient.semaphore.acquire(SEMAPHORE_ID, msg as any);

    setInFlight(msg);

    console.log("Semaphore requested", (resp as any).status, (resp as any).statusText);

    return resp;
  }

  app.get('/init', async (req: Request, res: Response) => {
    try {
      await requestSemaphore({ initialTest: true });
    } catch (ex) {
      const err = await (ex as any).text();
      console.log(`Error: ${(ex as any).status} ${err}`);
    }

    res.redirect("/");
  });


  app.post('/processor', async (req: Request, res: Response) => {
    console.log("Acquired lock", JSON.stringify(req.query));
    console.log("Acquired lock, headers", JSON.stringify(req.headers));

    const jobCrn = req.headers["x-chainstream-job-crn"];

    (async () => {
      const p = ["boolean","undefined"].includes(typeof autotest) ? processRequest : (autotest as typeof processRequest);
      await p(req.query);

      try {
        const resp = await websemaphoreClient.semaphore.release(SEMAPHORE_ID, { channelId: "default", jobCrn } as any);
        // console.log(`Release response: ${JSON.stringify(resp?.data)}`);
        console.log('Done');
      } catch (ex) {
        console.log("Couldn't release semaphore: ", (ex as any)?.error?.message)
      }
      console.log("Above attempted to release job", jobCrn);

    })();

    res.send("Ok")
  });

  app.get('/', async (req: Request, res: Response) => {
    const index = readFileSync("./pages/index.html").toString();

    res.send(index);
  });

  app.get('/exit', async (req: Request, res: Response) => {
    res.redirect("/");
    setTimeout(() => {
      process.exit();
    }, 500);
  });

  app.get('/log', async (req: Request, res: Response) => {
    res.send(log.join("\n"));
  });

  app.get('/stats', async (req: Request, res: Response) => {
    res.send(JSON.stringify(stats || "", null, "\t"));
  });

  const tunnel = await tunnels[env.TUNNELING_PROVIDER](app, env.HTTP_PORT);

  console.log("connected, configuring semaphore...")

  const callback = `${tunnel.host}/processor`;

  const websemaphoreConfig = configureSemaphore(callback)
  tunnel.app.listen(env.HTTP_PORT);

  const callbackUrl = `${tunnel.host}/processor`;

  if(typeof autotest == 'boolean' && autotest)
    try {
      await websemaphoreClient.semaphore.upsert(websemaphoreConfig);

      await configureSemaphore(callbackUrl)

      console.log(`Semaphore '${SEMAPHORE_ID}' configured to callback ${callback}`);
      console.log(`Testing with one message. Wait a few seconds or see the web ui at http://localhost:${PORT}`);
    
      try {
        // run initial test
        await requestSemaphore(JSON.stringify({ initialTest: true }));
      } catch (ex) {
        console.log((ex as any).message, (ex as any).status)
      }
    
    } catch (ex) {
      console.error(ex);
    }

  return {
    requestSemaphore,
    callbackUrl
  }
}

if (require.main === module)
  httpCallbackServer(true)

process.on('SIGINT', () => {
  console.log("\nGoodbye");
  process.exit();
});  // CTRL+C