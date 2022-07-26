import { Operation } from '../types';

export default class OperationCache {

  public async save(operation: Operation) {
    console.log("saving operation to cache");
  }

  public async getAll(): Promise<Operation[] | any> { // TO DO: remove any

  }

  // public static async get(operationId: string): Promise<Operation> {

  // }

  public async delete(operation: Operation): Promise<void> {
    console.log("deleting operation from cache", operation);
  }

  // public static async deleteAll(): Promise<void> {
  //   // delete all
  // }
}