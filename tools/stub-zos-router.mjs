export const push = (o) => { globalThis.__routerCalls && globalThis.__routerCalls.push({ type: 'push', ...o }) }
export const back = () => { globalThis.__routerCalls && globalThis.__routerCalls.push({ type: 'back' }) }
export const replace = (o) => { globalThis.__routerCalls && globalThis.__routerCalls.push({ type: 'replace', ...o }) }
