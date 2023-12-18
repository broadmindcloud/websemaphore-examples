# WebSemaphore websockets example

## Description

This is a basic implementation of asynchronous task invocation via [WebSemaphore](https://www.websemaphore.com) using websockets. 
The same technique may be applied using other serverside and serverless frameworks or non-javascript languages that have a websockets implementation.


## Usage

1. Clone the repo

   `git clone websemaphore-demos`

2. Change directory to the cloned and install the dependencies 

   `npm install`

3. Configure the API key in ./env.ts. Get a key at [here](https://www.websemaphore.com/semaphore/keys), or see [Configuring API keys](https://www.websemaphore.com/docs/v1/setup/key) for more info.

   Warning: Please note that storing the API Key in code is considered an insecure practice. Use a secrets manager instead.

4. 
   - Nodejs version `npm run nodejs`
   - Browser version `npm run browser`
      - Navigate to http://localhost:8087
      - In case of a port conflict set the port in env.ts

## See also
* For more information on asynchronous task invocation check out [Asynchromous WebSemaphore acquisition via a callback](https://www.websemaphore.com/docs/v1/concepts/scenarios#asynchronous-acquisition-via-callback)
* For more information on supported protocols check [Protocols](https://www.websemaphore.com/docs/v1/concepts/protocols)
* For full documenation see [WebSemaphore Docs](https://www.websemaphore.com/docs)


## License
ISC


