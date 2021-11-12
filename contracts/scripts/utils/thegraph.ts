import 'isomorphic-unfetch';
import {Client, createClient, OperationContext} from '@urql/core';

export type ListOptions =
  | {
      path?: string;
      getLastId?: (entries: unknown[]) => string;
    }
  | boolean;

export class TheGraph {
  private client: Client;

  constructor(url: string) {
    this.client = createClient({
      url,
    });
  }

  async complexQuery<T, Variables extends Record<string, unknown> = Record<string, unknown>>(
    queryString: string,
    options?: {
      variables?: Variables;
      path?: string;
      list?: ListOptions;
    }
  ): Promise<T | undefined> {
    const first = 1000;
    let numEntries = first;
    let lastId = '0x0';
    let data: T | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let list: any[] | undefined;
    while (numEntries === first) {
      try {
        const variables = {first, lastId, ...(options?.variables || {})};
        const querySplitted = queryString.split('?');
        let query = '';
        for (let i = 0; i < querySplitted.length; i++) {
          const split = querySplitted[i];
          if (split.startsWith('$')) {
            if (!options?.variables || !options?.variables[split.substr(1)]) {
              i++; // skip
            }
          } else {
            query += split;
          }
        }
        const result = await this.client.query(query, variables).toPromise();

        // console.log(result.data);

        if (result.error) {
          throw new Error(result.error.message);
        }

        if (!result.data) {
          throw new Error(`cannot fetch from thegraph node`);
        }

        const freshData = (options?.path ? result.data[options.path] : result.data) as T;
        if (!data) {
          data = freshData;
        }

        if (options?.list) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let freshList = freshData as unknown as any[];
          if (typeof options.list !== 'boolean' && options.list.path) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            freshList = (freshData as unknown as any)[options.list.path] as any[];
          }

          numEntries = freshList.length;
          if (numEntries > 0) {
            const newLastId =
              typeof options.list !== 'boolean' && options.list.getLastId !== undefined
                ? options.list.getLastId(freshList)
                : freshList[numEntries - 1].id;
            if (lastId === newLastId) {
              console.log('same query, stop');
              break;
            }
            lastId = newLastId;
          }

          if (!list) {
            list = freshList;
          } else {
            list.push(...freshList);
          }
        } else {
          numEntries = 0; // stop the loop
        }
      } catch (e) {
        numEntries = 0;
        console.error(e);
      }
    }
    return data;
  }

  async query<T>(
    queryString: string,
    options?: {
      field?: string;
      variables?: Record<string, unknown>;
      getLastId?: (entries: T[]) => string;
    }
  ): Promise<T[]> {
    const fields = options?.field?.split('.');
    const first = 100;
    let lastId = '0x0';
    let numEntries = first;
    let entries: T[] = [];
    while (numEntries === first) {
      const result = await this.client.query(queryString, {first, lastId, ...options?.variables}).toPromise();
      if (result.error) {
        throw new Error(result.error.message);
      }
      const data = result.data;

      // TODO deep access on root array
      let newEntries = data;
      if (data && fields) {
        let tmp = data;
        for (const fieldPart of fields) {
          tmp = tmp[fieldPart];
        }
        newEntries = tmp;
      }

      numEntries = newEntries.length;
      if (numEntries > 0) {
        const newLastId = options?.getLastId !== undefined ? options.getLastId(entries) : newEntries[numEntries - 1].id;
        if (lastId === newLastId) {
          console.log('same query, stop');
          break;
        }
        lastId = newLastId;
      }
      entries = entries.concat(newEntries);
    }
    return entries;
  }
}
