// here is the place to implement the processing / tracking business logic

import * as env from "../env";
import { config } from "./configure-semaphore";
import { setComplete, setInFlight } from "./tracking";

const tryParse = (str: any) => {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

export const processRequest: ({ message, jobCrn }: { message: any, jobCrn: string }) => Promise<void | "skip_release"> = async ({ message, jobCrn }) => {
    const time = (config?.timeout?.value || 5000)  + Math.round((Math.random() * 10000 - 7000)) //2 * 60 * 1000 + Math.random() * 8000;
    const startTime = Date.now();
    const niceTime = Math.round(time / 10) / 100;
    const msgId = message.id as string;

    setInFlight(message, `processing, remaining ${niceTime} out of ${niceTime} seconds`)

    const int = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const niceLeft = Math.round((time - elapsed) / 10) / 100;

        setInFlight(message, `processing, remaining ${niceLeft} out of ${niceTime} seconds`);
    }, 1000);

    console.log(`Task processing for ${niceTime} seconds`);

    debugger;

    // operation on limited resource

    return new Promise(res => {

        setTimeout(async () => {
            clearInterval(int);
            console.log(`Task done, releasing semaphore`);

            setComplete(message)
            console.log("Message:", JSON.stringify(message))
            let parsed = tryParse(message);
            if (parsed?.initialTest || true)
                console.log("NOTE THE TEMPORARY MEASURES")
                console.log(
                    `Test ok\n\n-------\n
      Server is listening.\n\n
      To run more manual tests navigate to http://localhost:${env.HTTP_PORT}\n
      ^C to exit\n
      -------\n\n`);

            res(undefined);

        }, time);

    })

}