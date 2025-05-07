/*
    Cancel a job during processing (inflight) (websockets)
    1. timeout the job
    2. cancel the job
    3. read the job and check that it's in archived status
*/

import { expect } from "../../../lib/shared";
import { _02_websockets_timeout } from "./02-websockets-timeout";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";
import { _01_websockets_basic } from "./01-websockets-basic";

export const _06_websockets_cancel = async (app: WebsemaphreTestSetup) => {
    // First, timeout the job
    const { jobCrn } = await _01_websockets_basic(
        app,
        {
            processor: async (data, { jobCrn }) => {
                app.console.log("Starting processing...");

                await new Promise((res) => setTimeout(res, 500));

                app.console.log("During processing: Canceling the job");

                await app.wsClientManager.client.cancel({ jobCrn });
            }
        }
    );

    app.console.log("Cancelled job crn:", jobCrn);


    await new Promise(r => setTimeout(r, 3000)); // the propagation takes some time. clients wouldn't usually care

    app.console.log("Reading the job");

    const canceledJobRes = await app.httpClient.semaphore.readJob(app.testSemaphore.id, { crn: jobCrn });

    app.console.log("Canceled job CRN:", canceledJobRes.data.crn);
    expect(canceledJobRes.data.status == "archived", "Job is not in archived status");
    app.console.log("Successfully canceled job", canceledJobRes.status);
}
