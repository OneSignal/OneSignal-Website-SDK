import Log from '../libraries/Log';

export default class TagManager {
    public static async tagFetchWithRetries(ms: number, maxTries: number): Promise<Object> {
        return  new Promise(async (resolve, reject) => {
            OneSignal.getTags()
            .then(resolve)
            .catch(()=>{
                if(!maxTries) return reject('Could not fetch tags');
                setTimeout(()=>{
                    Log.debug("Retrying getTags");
                    this.tagFetchWithRetries(ms, maxTries-1).then(resolve);
                }, ms);
            });
        });
    }
}