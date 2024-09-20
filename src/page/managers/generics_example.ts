interface A {
  a: string | undefined;
}

interface B {
  b: string | undefined;
}

interface B2 {
  b2: string | undefined;
}

class C<T> {
  data: T | undefined;

  constructor(data: T) {
    this.data = data;
  }
}

type AorB = A | B;

interface D {
  d: string | undefined;
}
type AorB2 = A | B | B2 | D;

function testReturn(): C<AorB> | undefined {
  return new C<A>({} as A);
}

function testFn(param1: C<AorB2>) {
  console.log('HERE');
}

testFn(new C<A>({} as A));
testFn(new C<B>({} as B));

const testResult = testReturn();
if (testResult instanceof C<AorB>) {
  testFn(testResult);
  console.log('Here');
}
