declare namespace jest {
  export interface It {
    /**
     * Used to stub a class function with the given return value.
     * @param obj The class prototype to stub.
     * @param method The method to stub.
     * @param returnValue The value to return.
     */
    stub: (obj: any, method: string, returnValue?: any) => jest.SpyInstance<any>;
    fail: () => void;
  }
}
