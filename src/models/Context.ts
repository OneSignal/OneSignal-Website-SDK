import { DynamicResourceLoader } from "../services/DynamicResourceLoader";


export default class Context {

  public dynamicResourceLoader: DynamicResourceLoader;

  constructor() {
    this.dynamicResourceLoader = new DynamicResourceLoader();
  }
}