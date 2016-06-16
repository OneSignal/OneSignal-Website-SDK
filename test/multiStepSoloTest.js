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
            console.log('Got called to go to step', stepName);
          location.href = `${location.href}&step=${stepName}`;
        };
        return new SoloTest(testInstance, options, testFn.bind(this, step, gotoStep));
    }
}