// timeout with option to await on it
export function awaitableTimeout(ms: number) :Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
