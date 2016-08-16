import Extension from './extension';
import Utils from './utils';
import PMPlus from './PMPlus';

/**
 * A "solo test" is a browser test that needs to be run in another separate browser tab due to test requirements like
 * page reloading or navigation that would break the main test page.
 *
 * Our main test runner will open a new browser tab that runs just a single test and communicates via PostMessage to
 * know whether the test passes or fails. Mocha has a feature where if you pass a URL query parameter of ?grep=... with
 * the value being the test name then this will be the only test shown and run.
 */
export default class SoloTest {

    constructor(testInstance, options, testFn) {
        this.test = testInstance;
        if (this.isTestNameIllegal(this.test.title)) {
            return Promise.reject(new Error(`Your test name of '${this.test.title}' is illegal because Mocha cannot ` +
                `properly grep ( ). Please rewrite your test name to exclude these special characters.`));
        }
        this.options = options;
        return new Promise((resolve, reject) => {
            if (!this.isSoloInstance(this.test.title)) {
                this.createSoloInstance(this.test.title, resolve, reject);
            } else {
                this.initSoloInstance(this.test.title);
                try {
                    Promise.resolve(testFn())
                        .then(() => this.finishSoloInstance())
                        .catch(e => {
                            this.testErrorHelper(e);
                        });
                } catch (e) {
                    this.testErrorHelper(e);
                }
            }
        });
    }

    /**
     * Reports the test error in detail to the console.
     * @param e The detailed test error enhanced by source maps.
     */
    testErrorHelper(e) {
        Utils.captureError(e).then(detailedError => {
            console.group('Mocha Test:', this.test.title);
            console.error(e);
            console.error(detailedError);
            console.groupEnd();
            this.finishSoloInstance(detailedError);
        });
    }

    /**
     * Returns true if only this test is being run in a separate browser tab.
     * @returns {*}
     */
    isSoloInstance(testName) {
        let url = new URL(location.href);
        let params = new URLSearchParams(url.search.slice(1));
        /* Mocha has a feature where if you pass a URL query parameter of ?grep=... with the value being the test name
           then this will be the only test shown and run. */
        return decodeURIComponent(params.get('grep')) === testName;
    }

    /**
     * The main test page calls this to open a new window to run just one test (Mocha provides functionality to run
     * just one test given a special URL query parameter). A PostMessage channel is established with the other page
     * to comomunicate the test result).
     * @param testName The name of the test obtained by `this.test.title`.
     * @param resolve The test Promise that makes this test pass.
     * @param reject The test Promise that makes this test fail.
     */
    createSoloInstance(testName, resolve, reject) {
        this.pm = new PMPlus({
            listenDomain: location.origin
        });
        this.pm.listen(testName, (response, respond) => {
            // Reply to the test runner in this block
            respond(true, {finished: true});
            if (JSON.parse(response) === "test_successful") {
                this.pm.destroy();
                resolve();
            } else {
                this.pm.destroy();
                reject(new Error(response));
            }
        });
        let url = new URL(location.href);
        let params = new URLSearchParams();
        params.set('grep', encodeURIComponent(testName));
        //Extension.createBrowserTab(`${url.origin}${url.pathname}?${Utils.urlSearchParamToString(params)}`);
        window.open(url.origin + url.pathname + Utils.urlSearchParamToString(params));
    }

    /**
     * Called from the isolated running test instance at the beginning of the test to listen for its parent test
     * PostMessage messages.
     */
    initSoloInstance(testName) {
        this.pm = new PMPlus({
            sendDomain: location.origin
        });
    }

    /**
     * Called from the isolated running test instance at the end to reply with a result to the parent test page
     * indicating a test success or failure.
     * @param error Leave null or undefined to say the test pass. Otherwise reply with an error string that will be
     * shown on the main test page as the Promise rejects.
     */
    finishSoloInstance(error) {
        this.pm.send({
            w: window.opener,
            channel: this.test.title,
            data: error ? JSON.stringify(error, Object.getOwnPropertyNames(error), 4) : JSON.stringify("test_successful"),
            callback: (success, reply) => {
                if (reply.finished && (this.options.close !== false) && !error) {
                    window.close();
                }
            }
        });
    }

    /**
     * The test runner has some problems with parentheses and commas so we'll take them out.
     */
    isTestNameIllegal(testName) {
        return testName.replace(/\(/g, '')
            .replace(/\)/g, '') !== testName;
    }
}