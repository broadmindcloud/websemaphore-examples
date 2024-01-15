import { Application } from "express";
import createExternalUrl from "localhost-run";



export const tunnel = async (app: Application, port: number) => { //, onConnect: (tunnelUrl: string, app: Express.Application) => void) => {
    const result = await createExternalUrl({ port })
    return { app, host: "https://" + result.domain };
}
