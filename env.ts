/*
    get a key at https://www.websemaphore.com/semaphore/keys
*/
export const APIKEY = "ApiKey <...your key here...>"; // 

/*
    change if this port is busy on your machine
*/
export const HTTP_PORT = 8087;

/*
    set to ALL for verbose logging
*/
export const LOG_LEVEL = "";

/*
    use another semaphore id
*/
export const SEMAPHORE_ID = "websemaphore-examples";

/*
    the tunneling provider is only necessary for local demo/testing
    if you have a proper domain it should be used - see ./lib/configure-semaphore.ts

    available settings: "localhost.run" and "ngrok"
    localhost.run is the default and will work with no additional setup
    if you prefer ngrok for some specific reason, you need to set env variable NGROK_AUTHTOKEN - see their docs
*/
export const TUNNELING_PROVIDER = "localhost.run"