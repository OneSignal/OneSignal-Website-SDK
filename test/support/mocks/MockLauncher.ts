import Launcher from "../../../src/page/bell/Launcher";


export default class MockLauncher extends Launcher {
    async resize() {
      return undefined;
    }

    async show() {
      return undefined;
    }

    async hide() {
      return undefined;
    }

    async inactivate() {
      return undefined;
    }

    async activate() {
      return undefined;
    }
}