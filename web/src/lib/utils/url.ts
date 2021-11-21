import {base} from '$app/paths';
import {getParamsFromURL, hashStringFromHashParams, queryStringifyNoArray} from './web';
import {params, globalQueryParams, hashParams} from '$lib/config';

export function url(path: string): string {
  const paramFromPath = getParamsFromURL(path);
  for (const queryParam of globalQueryParams) {
    if (typeof params[queryParam] != 'undefined' && typeof paramFromPath[queryParam] === 'undefined') {
      paramFromPath[queryParam] = params[queryParam];
    }
  }
  const hashParamsToKeep = {};
  for (const key of Object.keys(hashParams)) {
    if (key === 'passKey') {
      // TODO global keys array, like globalQueryParams
      hashParamsToKeep[key] = hashParams[key];
    }
  }

  return `${base}/${path}${queryStringifyNoArray(paramFromPath)}${hashStringFromHashParams(hashParamsToKeep)}`;
}

export function urlOfPath(url: string, path: string): boolean {
  const basicUrl = url.split('?')[0].split('#')[0];
  return basicUrl.replace(base, '').replace(/^\/+|\/+$/g, '') === path.replace(/^\/+|\/+$/g, '');
}
