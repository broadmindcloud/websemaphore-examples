import { HttpResponse, SemaphoreUpsertRequest, WebsemaphoreHttpClient } from "websemaphore/src";
import * as env from "../../../env";
import { WebsocketsClientManager } from "websemaphore/src/clients/websockets/manager";
export { env };

export const log = console.log;

export type HttpCallbackProcessor = (message: any, { jobCrn }: { jobCrn: string }) => void;

export type WebSemaphoreTestParams = {
    httpClient: WebsemaphoreHttpClient;
    wsClientManager: WebsocketsClientManager;
    testSemaphore: any;
    httpCallbackServer: {
        requestSemaphore: (message?: any) => Promise<HttpResponse<void, void>>;
        callbackUrl: string;
        setHttpProcessor: (p: HttpCallbackProcessor) => void
    },
};

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


export const panic = (bool: boolean, message: string) => {
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
        websockets: {
            isActive: true,
            onClientDropped: "drop"
        },
        maxValue: 3,
        isActive: true,
        timeout: {},
        mapping: {},
        ...(extraConfig || {})
    };
    console.log(cfg);
    return (await client.semaphore.upsert(cfg)).data;
};
