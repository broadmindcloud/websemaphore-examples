# WebSemaphore http example

## Description

This is a basic implementation of asynchronous task invocation via [WebSemaphore](https://www.websemaphore.com) using http(s). 
The same technique may be applied using other serverside and serverless frameworks or non-javascript languages as long as it can make an http call. The target party should be able to receive an inbound https call, i.e. be accessible via a public endpoint url.


## How it works
1. To configure a public endpoint, this example is using [ngrok](https://ngrok.com/). It will create a temporary tunnel at a public domain so that WebSemaphore can invoke the processor endpoint (see 3. Usage Scenarios at [integration scenarios](https://www.websemaphore.com/docs/v1/concepts/scenarios-integration#usage-scenarios) in the docs). To use ngrok you need to set the `NGROK_AUTHTOKEN` environment variable to an NGROK api token that you can get on their website. WebSemaphore is not promoting or affiliated with ngrok.
2. The demo will then create a WebSemaphore and configure its callback endpoint created in 1.
3. It will send a test message and await 
Please note WebSemaphore is not affiliated with ngrok in any way.  

## Usage

1. Clone the repo

   `git clone broadmindcloud/websemaphore-examples`

2. Change directory to the cloned repo /http directory and install the dependencies:

   `npm install`

3. Configure the API key in ./env.ts. Get a key [here](https://www.websemaphore.com/semaphore/keys), or see [Configuring API keys](https://www.websemaphore.com/docs/v1/setup/key) for more info.

   Warning: Please note that storing the API Key in code is considered an insecure practice. Use a secrets manager instead.

4. 
   - Nodejs version `npm run nodejs`
   - Browser version `npm run browser`
      - Navigate to http://localhost:8087
      - In case of a port conflict set the port in env.ts

5. The example will perform a one-message test and exit. For more interactive see the [http example](../http) or the demos in the websemaphore console.

## See also
* [Asynchromous WebSemaphore acquisition via a callback](https://www.websemaphore.com/docs/v1/concepts/scenarios#asynchronous-acquisition-via-callback)
* [Supported protocols](https://www.websemaphore.com/docs/v1/concepts/protocols)
* [Async and sync modes](https://www.websemaphore.com/docs/v1/concepts/operating-modes)
* [WebSemaphore Docs](https://www.websemaphore.com/docs)


## License
ISC
