
import { setup } from "./tests/00-setup";

import { _01_BasicTest } from "./tests/01-basic";
import { _02_TimeoutTest } from "./tests/02-timeout";
import { _03_RescheduleTest } from "./tests/03-reschedule-basic";
import { _04_RescheduleOrderRetentionTest } from "./tests/04-reschedule-order";
import { _05_RequeueTest } from "./tests/05-requeue";
import { _06_CancelTest } from "./tests/06-cancel-test";
import { _07_DeleteTest } from "./tests/07-delete-test";

import { _10_mapping_basic } from "./tests/10-mapping-basic";
import { _11_mapping_change_transport } from "./tests/11-mapping-change-transport";

import { _21_transport_http_fallback } from "./tests/21-transport-http-fallback";
import { _22_transport_websemaphore_fallback } from "./tests/22-transport-websemaphore-fallback";

const ALL_TESTS: Record<string, (...p: Parameters<typeof _01_BasicTest>) => any> = {
    _01_BasicTest,
    _02_TimeoutTest,
    _03_RescheduleTest,
    _04_RescheduleOrderRetentionTest,
    _05_RequeueTest,
    _06_CancelTest,
    _07_DeleteTest,

    _10_mapping_basic,
    _11_mapping_change_transport,
    // _21_transport_http_fallback,
    // _22_transport_websemaphore_fallback
}

Object.keys(ALL_TESTS);
const TESTS: typeof ALL_TESTS = { 
    // _02_TimeoutTest
    // ...ALL_TESTS,
    _21_transport_http_fallback
}

const main = async () => {
    const config = await setup();

    const tests = TESTS

    console.time("Total test time")
    try {
        for (const testName in tests) {
            console.log("=".repeat(40));
            console.time(testName);
            console.log("START TEST: " + testName);
            console.log("=".repeat(40));

            const test = TESTS[testName];

            await test(config);
            console.log("=".repeat(40));
            console.timeEnd(testName);
            console.log("=".repeat(40));
        }

        console.log(Object.keys(TESTS).length, " tests were completed successfully");
        console.timeEnd("Total test time")

    } catch (ex) {
        console.log("Error during tests:", ex);
    }
    process.exit(0);
}

main();
