import { WebSemaphoreHttpClientManager } from "websemaphore";
import tunnels from './lib/tunnels';
import { readFileSync } from 'fs';
import express from 'express';
import { Request, Response } from 'express';

import fetch from "node-fetch";
import * as env from "../env";
import { processRequest } from "./lib/process";
import { configureSemaphore } from "./lib/configure-semaphore";
import { setInFlight, stats } from "./tracking";


const websemaphoreManager = WebSemaphoreHttpClientManager({ logLevel: env.LOG_LEVEL, token: env.APIKEY });
const websemaphoreClient = websemaphoreManager.initialize({ fetch });

websemaphoreClient.setSecurityData({ token: env.APIKEY })

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
  
  setInFlight(msg)

  console.log("Semaphore requested", (resp as any).status, (resp as any).statusText);

  return resp;
}

app.get('/init', async (req: Request, res: Response) => {
  try {
    await requestSemaphore();
  } catch (ex) {
    const err = await (ex as any).text();
    console.log(`Error: ${(ex as any).status} ${err}`);
  }

  res.redirect("/");
});


app.get('/processor', async (req: Request, res: Response) => {
  console.log("Acquired lock", JSON.stringify(req.query));

  (async () => {
    await processRequest(req.query);

    const resp = await websemaphoreClient.semaphore.release(SEMAPHORE_ID, { channelId: "default" });
    console.log(`Release response: ${JSON.stringify(resp.data)}`);
    console.log('Done');
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

const main = async () => {
  const tunnel = await tunnels[env.TUNNELING_PROVIDER](app, env.HTTP_PORT);
  
  console.log("connected, configuring semaphore...")
  
  const callback = `${tunnel.host}/processor`;
  const websemaphoreConfig = configureSemaphore(callback)

  try {
    await websemaphoreClient.semaphore.upsert(websemaphoreConfig);

  } catch (ex) {
    console.error(ex);
  }

  await configureSemaphore(`${tunnel.host}/processor`)

  console.log(`Semaphore '${SEMAPHORE_ID}' configured to callback ${callback}`);
  console.log(`Testing with one message. Wait a few seconds or see the web ui at http://localhost:${PORT}`);

  try {
    // run initial test
    await requestSemaphore(JSON.stringify({ initialTest: true }));
  } catch (ex) {
    console.log((ex as any).message, ex)
  }
  
  tunnel.app.listen(env.HTTP_PORT);
}

main()

process.on('SIGINT', () => {
  console.log("\nGoodbye");
  process.exit();
});  // CTRL+C