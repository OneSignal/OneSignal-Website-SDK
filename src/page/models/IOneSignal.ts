interface IndexableByString<T> {
  [key: string]: T;
}

interface IOneSignal extends IndexableByString<any> {
  [key: string]: any;
}
