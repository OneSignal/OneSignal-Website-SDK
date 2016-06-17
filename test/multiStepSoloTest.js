import Extension from './extension';
import Utils from './utils';
import PMPlus from './PMPlus';
import SoloTest from './soloTest';

/**
 * A "multi-step solo test" is similar to a solo test except that the test can be split into multiple parts over page
 * refreshes. The test will "remember" the state of the test based on the URL.
 */
export default class MultiStepSoloTest {
    constructor(testInstance, options, testFn) {
        let params = new URL(location.href).searchParams;
        let step = params.get('step') ? params.get('step') : 'first';
        let gotoStep = stepName => {
            return new Promise(() => {
                // This promise should never resolve, otherwise the test will pass prematurely in one of the stages
                console.warn('Proceeding to test step:', stepName);
                params.set('step', stepName);
                location.href = location.origin + location.pathname + Utils.urlSearchParamToString(params);
            });
        };
        return new SoloTest(testInstance, options, testFn.bind(this, step, gotoStep));
    }
}