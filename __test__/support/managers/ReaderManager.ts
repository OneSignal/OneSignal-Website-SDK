import * as fs from 'fs';

export class ReaderManager {
  static async readFile(path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        }
        if (!data) {
          console.error("Couldn't read file:", path);
          return;
        }
        resolve(data);
      });
    });
  }
}
