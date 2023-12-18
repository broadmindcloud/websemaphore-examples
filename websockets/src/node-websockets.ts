import { WebSocket } from "ws";
import { WebSemaphoreWebsocketsClientManager } from "websemaphore";
import { webSocketsSemaphoreTest } from "./shared";
import * as env from "../../env";


const main = async () => {
    const manager = WebSemaphoreWebsocketsClientManager({ websockets: WebSocket as any, logLevel: "ALL" });
    const client = await manager.connect(env.APIKEY);
    debugger;
    await webSocketsSemaphoreTest(client);

    console.log("Closing connection");

    await manager.disconnect();

    console.log("Test ok");

    process.exit();
}

main();