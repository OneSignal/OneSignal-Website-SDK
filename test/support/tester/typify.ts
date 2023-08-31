import ava from 'ava';

export function beforeEach<T>(getContext: () => Promise<T>): any {
  ava.beforeEach(async (t) => {
    Object.assign(t.context, await getContext());
  });

  return ava;
}
