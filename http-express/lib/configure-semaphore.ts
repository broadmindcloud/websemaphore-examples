import * as env from "../../env";

const { SEMAPHORE_ID } = env;

export const configureSemaphore = (callback: string) => {
    console.log(`Configuring semaphore '${SEMAPHORE_ID}' to callback ${callback}`);

    const config = {
        id: SEMAPHORE_ID,
        title: "websemaphore-examples",
        maxValue: 3,
        isActive: true,
        callback: {
          onDeliveryError: "drop",
          isActive: true,
          address: callback
        },
        websockets: {
          onClientDropped: "drop"
        }
      }

    return config;
  }