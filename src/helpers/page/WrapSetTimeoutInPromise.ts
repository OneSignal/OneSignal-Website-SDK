
export async function wrapSetTimeoutInPromise(callback: Function, timeDelaySeconds: number): Promise<void> {
    await new Promise((resolve, reject) => {
    setTimeout(async () => {
        try {
            await callback();
            resolve();
        } catch(e) {
            reject(e);
        }}, timeDelaySeconds*1000
    );
    });
}
