import test, { afterEach } from 'ava'
import sinon, { SinonSpy, SinonSandbox } from 'sinon';

import SWLog, { SWLogConsole } from "../../../src/libraries/SWLog"

const sinonSandbox: SinonSandbox = sinon.sandbox.create();

const spyOnConsole: (target: SWLogConsole) => SWLogConsole = (target) => {
  let spiedUponConsole = target || SWLog.consoles.null;

  Object.keys(spiedUponConsole).forEach(
    (m: string, _n: number, _a: string[]) => {
      sinonSandbox.spy(spiedUponConsole, m as keyof SWLogConsole)
    }
  );

  return spiedUponConsole;
}

afterEach(() => {
  sinonSandbox.restore();
})

test('singletonConsole - behaves like a singleton', async t => {
  SWLog.resetConsole();

  const singletonConsoleA = SWLog.singletonConsole
  const singletonConsoleB = SWLog.singletonConsole
  t.is(singletonConsoleA, singletonConsoleB); // test is agnostic to what it is

  SWLog.resetConsole(SWLog.consoles.env);
  t.not(singletonConsoleA, SWLog.singletonConsole)
  t.not(singletonConsoleB, SWLog.singletonConsole)
});

test('it defaults to null console', async t => {
  SWLog.resetConsole(undefined); // ensure (is global state)

  // NB no explicit reset
  const console = spyOnConsole(SWLog.consoles.null);

  SWLog.singletonConsole.log('logging: log');
  t.true((console.log as SinonSpy).called);

  SWLog.singletonConsole.trace('logging: trace');
  t.true((console.trace as SinonSpy).called);

  SWLog.singletonConsole.debug('logging: debug');
  t.true((console.debug as SinonSpy).called);

  SWLog.singletonConsole.info('logging: info');
  t.true((console.info as SinonSpy).called);

  SWLog.singletonConsole.warn('logging: warn');
  t.true((console.warn as SinonSpy).called);

  SWLog.singletonConsole.error('logging: error');
  t.true((console.error as SinonSpy).called);
});


test('it invokes the provided console', async t => {
  const console = spyOnConsole(SWLog.consoles.null);
  SWLog.resetConsole(console);

  SWLog.singletonConsole.log('logging: log');
  t.true((console.log as SinonSpy).called);

  SWLog.singletonConsole.trace('logging: trace');
  t.true((console.trace as SinonSpy).called);

  SWLog.singletonConsole.debug('logging: debug');
  t.true((console.debug as SinonSpy).called);

  SWLog.singletonConsole.info('logging: info');
  t.true((console.info as SinonSpy).called);

  SWLog.singletonConsole.warn('logging: warn');
  t.true((console.warn as SinonSpy).called);

  SWLog.singletonConsole.error('logging: error');
  t.true((console.error as SinonSpy).called);
});

test('it uses specified console; ignores others', async t => {
  // disproving normal `console.log`:
  const decoy = spyOnConsole(SWLog.consoles.env);

  const console = spyOnConsole(SWLog.consoles.null);
  SWLog.resetConsole(console);

  SWLog.singletonConsole.log('logging: log');
  t.true((console.log as SinonSpy).called);
  t.false((decoy.log as SinonSpy).called);

  SWLog.singletonConsole.trace('logging: trace');
  t.true((console.trace as SinonSpy).called);
  t.false((decoy.trace as SinonSpy).called);

  SWLog.singletonConsole.debug('logging: debug');
  t.true((console.debug as SinonSpy).called);
  t.false((decoy.debug as SinonSpy).called);

  SWLog.singletonConsole.info('logging: info');
  t.true((console.info as SinonSpy).called);
  t.false((decoy.info as SinonSpy).called);

  SWLog.singletonConsole.warn('logging: warn');
  t.true((console.warn as SinonSpy).called);
  t.false((decoy.warn as SinonSpy).called);

  SWLog.singletonConsole.error('logging: error');
  t.true((console.error as SinonSpy).called);
  t.false((decoy.error as SinonSpy).called);
})
