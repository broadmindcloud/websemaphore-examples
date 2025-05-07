
export const stats = {
    inFlight: {} as Record<string, string>,
    history: [] as string[]
}

export const setInFlight = (msg: any, value?: string) => {
    stats.inFlight[msg.id] = value || "waiting";
}

export const setComplete = (msg: any) => {
    stats.history.unshift(msg.id)
    delete stats.inFlight[msg.id];
}
