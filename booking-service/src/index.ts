import {InvalidMethod, UnknownRequestType} from './errors';
import type {Env, CronTrigger} from './types';
import {corsHeaders} from './utils';

// In order for the workers runtime to find the class that implements
// our Durable Object namespace, we must export it from the root module.
export {Bookings} from './Bookings';

function handleOptions(request: Request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    return new Response(null, {
      headers: corsHeaders,
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    try {
      const response = await handleRequest(request, env);
      return response;
    } catch (e: unknown) {
      // console.error('ERROR', e);
      const message = (e as {message: string}).message;
      if (message) {
        return new Response(message);
      } else {
        return new Response(e as string);
      }
    }
  },

  async scheduled(trigger: CronTrigger, env: Env, event: ScheduledEvent) {
    const BASE_URL = 'http://127.0.0.1';
    const id = env.BOOKINGS.idFromName('A');
    const obj = env.BOOKINGS.get(id);
    if (trigger.cron === '* * * * *') {
      console.log('CRON: checkTransactions...');
      event.waitUntil(obj.fetch(`${BASE_URL}/checkTransactions`));
    }
  },
};

async function handleRequest(request: Request, env: Env): Promise<Response> {
  const id = env.BOOKINGS.idFromName('A');
  const obj = env.BOOKINGS.get(id);

  const url = new URL(request.url);
  const method = request.method;
  const path = url.pathname.substr(1).split('/');
  const fnc = path[0];
  if (fnc === 'book') {
    if (method !== 'POST') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'list') {
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  } else if (fnc === 'deleteAll') {
    // TODO remove unless admin
    if (method !== 'GET') {
      return InvalidMethod();
    }
    let resp = await obj.fetch(url.toString(), request);
    return resp;
  }
  return UnknownRequestType();
}
