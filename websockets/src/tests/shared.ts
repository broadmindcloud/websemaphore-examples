export type Logger = typeof console.log;

export const process = async (payload: any, log: Logger) => {
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
