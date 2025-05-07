import { setInFlight, stats } from "../tracking";
import express from 'express';
import { Request, Response } from 'express';
import { env, HttpCallbackProcessor, websemaphoreClient } from "../shared";
import { readFileSync } from 'fs';


const _fetch: typeof fetch = async (url: RequestInfo | URL, opts?: RequestInit) => {
  const res = await fetch(url, opts);
  debugger

  console.log("*".repeat(10), url)
  console.log(url)
  console.log(JSON.stringify(opts?.headers))
  // console.log("body:", JSON.stringify(opts?.body || ""));
  console.log("res:", await res.text())
  console.log("res headers:\n", Array.from(res.headers?.entries() || []).join("\n"));
  console.log("*".repeat(10))
  // console.log("Headers:", res.headers);

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

export const initExpress = (processor: HttpCallbackProcessor, opts: { console: typeof console } = { console }) => {
  const app: express.Application = express().use(express.json());

  const console = opts?.console || global.console;

  const _orig = console.log.bind(console);
  const log = [] as string[];


  const SEMAPHORE_ID = env.SEMAPHORE_ID;

  if (!env.APIKEY) {
    console.error("API Key is not set. Configure in env.ts; read more at https://www.websemaphore.com/docs/v1/setup/key");
    process.exit();
  }


  // app.get('/init', async (req: Request, res: Response) => {
  //   try {
  //     await requestSemaphore({ initialTest: true });
  //   } catch (ex) {
  //     const err = await (ex as any).text();
  //     console.log(`Error: ${(ex as any).status} ${err}`);
  //   }

  //   res.redirect("/");
  // });


  app.post('/processor', async (req: Request, res: Response) => {
    opts.console.log("Express: Acquired lock", JSON.stringify(req.body));
    opts.console.log("Express: Acquired lock, headers", JSON.stringify(req.headers));

    const jobCrn = req.headers["x-chainstream-job-crn"];

    res.send({ status: "Ok" });

    try {
      if (processor) {
        const r = await processor({ message: req.body, jobCrn: jobCrn as string });
        if (r == "skip_release") {
          opts.console.log("Express: Skipping default release for ", jobCrn);
          return 
        }
      }

      // console.log("Default release");
      const resp = await websemaphoreClient.semaphore.release(SEMAPHORE_ID, { channelId: "default", jobCrn } as any);

      console.log("Express:", !!processor ? "processor didn't return skip_release, will release:" : "no processor, will release:", jobCrn);

      // console.log(`Release response: ${JSON.stringify(resp?.data)}`);
      // console.log('Done');
    } catch (ex) {
      opts.console.log("Express: Default release: couldn't release semaphore: ", (ex as any))
    }
    opts.console.log("Express: Default release: above attempted to release job", jobCrn);

    // res.send({ status: "Ok" })
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

  return app;
}