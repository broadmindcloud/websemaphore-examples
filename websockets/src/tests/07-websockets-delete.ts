/*
    Delete a job in timeout status (http)

    1. acquire a job
    2. timeout the job
    3. delete the job
    4. read the job and check that it's in archived status
*/

import { expect } from "../../../lib/shared";
import { WebsemaphreTestSetup } from "../../../lib/WebsemaphreTestSetup";
import { _02_http_timeout } from "./02-http-timeout";

export const _07_websockets_delete = async (app: WebsemaphreTestSetup) => {
    // First, timeout the job
    const { timedOutJob } = await _02_http_timeout(app);

    app.console.log("Timed out job CRN:", timedOutJob.crn);

    app.console.log("Deleting the job:");
    const canceledJob = await app.wsClientManager.client.delete({ jobCrn: timedOutJob?.crn! });

    await new Promise(r => setTimeout(r, 1000)); // the propagation takes some time. clients wouldn't usually care

    app.console.log("Reading the job:");

    const deletedJobRes = await app.httpClient.semaphore.readJob(app.testSemaphore.id, { crn: canceledJob.jobCrn });

    app.console.log("Canceled job CRN:", deletedJobRes.data.crn);
    expect(deletedJobRes.data.status == "archived", "Job is not in archived status");
    app.console.log("Successfully canceled job", canceledJob.status);
}
