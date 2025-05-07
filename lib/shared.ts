import { WebSemaphoreHttpClientManager, WebSemaphoreWebsocketsClient } from "websemaphore/src";
import * as env from "../env";

type Logger = typeof console.log;

const process = async (payload: any, log: Logger) => {
    // do work
    let workDuration = Math.round(5 + 5 * Math.random());

    log("NOTE: Please wait for the job to finish so the semaphore is relased.")
    log(`Processing: ${workDuration} sec, payload: ${JSON.stringify(payload)}`);

    while (workDuration > 0) {
        await new Promise(res => setTimeout(res, 1000));
        workDuration -= 1;
        log("Time to finish: ", workDuration)
    }

    log("Processing done")
}

export const monitoredFetch: typeof fetch = async (url: RequestInfo | URL, opts?: RequestInit) => {
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
  
export const websemaphoreManager = WebSemaphoreHttpClientManager({ logLevel: env.LOG_LEVEL as any, token: env.APIKEY });
export const websemaphoreClient = websemaphoreManager.initialize({ baseUrl: "us-dev" }); //"https://us-dev.websemaphore.com" });
  
websemaphoreClient.setSecurityData({ token: env.APIKEY! })
  
  


import { HttpResponse, SemaphoreUpsertRequest, WebsemaphoreHttpClient } from "websemaphore/src";
import { WebsocketsClientManager } from "websemaphore/src/clients/websockets/manager";
import { HttpCallbackServer } from "./server/HttpCallbackServer";
import { WebsemaphreTestSetup } from "./WebsemaphreTestSetup";
export { env };

export const log = console.log;

export type HttpCallbackProcessor = ({ message, jobCrn }: { message: any, jobCrn: string }) => Promise<void | "skip_release">;
export type HttpJobProcessor = ({ message, jobCrn, release }: { message: any, jobCrn: string, release: () => Promise<void> }) => Promise<void | "skip_release">;

// export type HttpCallbackServer = {
//     requestSemaphore: (message?: any) => Promise<HttpResponse<void, void>>;
//     callbackUrl: string;
//     setHttpProcessor: (p: HttpCallbackProcessor) => void,
//     waitForMessage: () => Promise<{ message: any; jobCrn: string; release: () => Promise<void>; }>,
//     acquire: ((
//         channelCrn: string | { semaphoreId: string, channelId: string }, 
//         input: any,
//         opts?: { waitForMessage?: boolean }
//     ) => Promise<{ message: any; jobCrn: string; release: () => Promise<void> }>),
// };

// export type WebSemaphoreTestParams = {
//     httpClient: WebsemaphoreHttpClient;
//     wsClientManager: WebsocketsClientManager;
//     testSemaphore: any;
//     httpCallbackServer: WebsemaphreTestSetup,
//     // restartHttpServer: () => Promise<WebSemaphoreTestParams>
// };
// restartHttpServer: () => 

export const _process = async (payload: any, executionTime?: number) => {
    // do work
    let workDuration = executionTime! > 0 ? executionTime : Math.round(5 + 5 * Math.random());

    log("NOTE: Please wait for the job to finish so the semaphore is relased.")
    log(`Processing: ${workDuration} sec, payload: ${JSON.stringify(payload)}`);

    while (workDuration! > 0) {
        await new Promise(res => setTimeout(res, 1000));
        workDuration! -= 1;
        log("Time to finish: ", workDuration)
    }

    log("Processing done");
}


export const expect = (bool: boolean, message: string) => {
    if (!bool) {
        console.error(new Error(message));
        global.process.exit();
    }
}

const stage = "us-dev"; // environment stage (e.g., development, staging, production)
const TEST_SEMAPHORE_ID = env.SEMAPHORE_ID; // semaphore ID from environment variables

export const upsertSemaphore = async (client: WebsemaphoreHttpClient, extraConfig?: Partial<SemaphoreUpsertRequest>) => {
    const cfg = {
        id: TEST_SEMAPHORE_ID,
        maxValue: 3,
        isActive: true,
        timeout: {},
        mapping: {},
        // routing: [
        //     {
        //         isActive: true,
        //         onError: "drop" as "drop"
        //     }    
        // ],
        ...(extraConfig || {})
    };
    console.log("Upserting semaphore config:", JSON.stringify(cfg));
    try {
        const r = await client.semaphore.upsert(cfg);
        return r?.data;
    } catch (ex) {
        console.error(ex);
        throw ex;
    }
};
