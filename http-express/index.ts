import { WebSemaphoreHttpClientManager } from "websemaphore";
import { tunnel } from './ngrok-express';
import { readFileSync } from 'fs';
import express from 'express';
import { Request, Response } from 'express';


const app: express.Application = express();

const _orig = console.log.bind(console);
const log = [] as string[];

const stats = {
  inFlight: {} as Record<string, string>,
  history: [] as string[]
}

console.log = (...args) => {
  _orig(...args);
  log.unshift(new Date().toISOString() + " " + ((args || []) as any[]).join(" "));
}

import fetch from "node-fetch";
import * as env from "../env";

const PORT = env.HTTP_PORT;
const SEMAPHORE_ID = env.SEMAPHORE_ID;

if(!env.APIKEY) {
  console.error("API Key is not set. Configure in env.ts; read more at https://www.websemaphore.com/docs/v1/setup/key");
  process.exit();
}

export const websemaphoreManager = WebSemaphoreHttpClientManager({ logLevel: "ALL" });

export const chainstreamClient = websemaphoreManager.initialize({ fetch });

chainstreamClient.setSecurityData({ token: env.APIKEY })


const requestSemaphore = async (message?: any) => {
  const msg = { channelId: "default", message: message || "hello semaphore", id: `${Date.now()}${Math.random()}`.replace(/\./g, "-") };
  const resp = await chainstreamClient.semaphore.acquire(SEMAPHORE_ID, msg as any);
  stats.inFlight[msg.id] = "waiting";

  console.log("Semaphore requested", (resp as any).status, (resp as any).statusText);

  return resp;
}

app.get('/init', async (req: Request, res: Response) => {
  // res.send('Task initiated');
  try {
    await requestSemaphore();
  } catch (ex) {
    const err = await (ex as any).text();
    console.log(`Error: ${(ex as any).status} ${err}`);
  }

  res.redirect("/");
});

const tryParse = (str: any) => {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

app.get('/processor', async (req: Request, res: Response) => {
  console.log("Acquired lock", JSON.stringify(req.query))

  const time = 2000 + Math.random() * 8000;
  const startTime = Date.now();
  const niceTime = Math.round(time / 10) / 100;
  const msgId = req.query.id as string;
  stats.inFlight[msgId] = `processing, remaining ${niceTime} out of ${niceTime} seconds`;

  const int = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const niceLeft = Math.round((time - elapsed) / 10) / 100;

    stats.inFlight[msgId] = `processing, remaining ${niceLeft} out of ${niceTime} seconds`;
  }, 1000);

  console.log(`Task processing for ${niceTime} seconds`);

  // operation on limited resource
  setTimeout(async () => {
    clearInterval(int);
    console.log(`Task done, releasing semaphore`);

    const resp = await chainstreamClient.semaphore.release("test", { channelId: "default" });
    console.log(`Release response: ${JSON.stringify(resp.data)}`);
    console.log('Done');

    stats.history.unshift(msgId)
    delete stats.inFlight[msgId];

    let parsed = tryParse(req.query.message);
    if(parsed.initialTest) 
      console.log(
        `Test ok\n\n-------\n
        Server is listening.\n\n
        To run more manual tests navigate to http://localhost:${env.HTTP_PORT}\n
        ^C to exit\n
        -------\n\n`);
  
  }, time);

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

const onTunnelConfigured = async (host: string) => {
  const cb = `${host}/processor`;
  console.log(`Configuring semaphore '${SEMAPHORE_ID}' to callback ${cb}`);
  try {
    await chainstreamClient.semaphore.upsert({
      id: SEMAPHORE_ID,
      title: "ngrok demo",
      maxValue: 3,
      isActive: true,
      callback: {
        onDeliveryError: "drop", isActive: true, address: cb
      }
    });
  
  } catch (ex) {
    console.error(ex);
  }
  console.log(`Semaphore '${SEMAPHORE_ID}' configured to callback ${cb}`);
  console.log(`Check the semaphore online: https://www.websemaphore.com/semaphore/${SEMAPHORE_ID}`);

  console.log(`Testing with one message. Wait a few seconds or see the web ui at http://localhost:${PORT}`);

  try {
  await requestSemaphore(JSON.stringify({ initialTest: true }));
  } catch (ex) {
    console.log((ex as any).message, ex)
  }
}


tunnel(app, onTunnelConfigured)
  .listen(env.HTTP_PORT, async () => {

  });


process.on('SIGINT', () => {
  console.log("\nGoodbye");
  process.exit();
});  // CTRL+C