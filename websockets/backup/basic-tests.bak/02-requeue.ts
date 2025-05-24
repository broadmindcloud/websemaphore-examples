import { WebSemaphoreWebsocketsClient } from "websemaphore/src";
import basic01 from "./01-basic";
import { Logger } from "../tests/shared";

const requeue = async (jobCrn: string, webSemaphoreClient: WebSemaphoreWebsocketsClient, log?: Logger) => {
    await new Promise((r) => setTimeout(r, 3000));
    const { release, payload, status, jobCrn: njobCrn } = await webSemaphoreClient.requeue({ jobCrn });
    await new Promise((r) => setTimeout(r, 3000));

    return njobCrn;
}

const reschedule = async (jobCrn: string, webSemaphoreClient: WebSemaphoreWebsocketsClient, log?: Logger) => {
    await new Promise((r) => setTimeout(r, 3000));
    const { release, payload, status, jobCrn: njobCrn } = await webSemaphoreClient.reschedule({ jobCrn });
    await new Promise((r) => setTimeout(r, 3000));
    return njobCrn;
}


const archive = async (jobCrn: string, webSemaphoreClient: WebSemaphoreWebsocketsClient, log?: Logger) => {
    await new Promise((r) => setTimeout(r, 3000));
    await webSemaphoreClient.archive({ jobCrn });
    return jobCrn;
}


const del = async (jobCrn: string, webSemaphoreClient: WebSemaphoreWebsocketsClient, log?: Logger) => {
    await new Promise((r) => setTimeout(r, 3000));
    webSemaphoreClient.delete({ jobCrn });
    return jobCrn;
}


const jobOperations = async (webSemaphoreClient: WebSemaphoreWebsocketsClient, log?: Logger) => {
    const jobCrn = await basic01(webSemaphoreClient, log);

    await archive(jobCrn, webSemaphoreClient, log);

    await requeue(jobCrn, webSemaphoreClient, log);
    await reschedule(jobCrn, webSemaphoreClient, log);
}

export default jobOperations;