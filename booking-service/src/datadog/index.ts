export function setupLogger(apiKey: string, application: string): DataDogLogger {
  return new DataDogLogger(apiKey, application, [application]);
}

export class DataDogLogger {
  constructor(protected apiKey: string, protected application: string, protected tags: string[] = []) {}

  async log(request: Request, message: any, status: 'error' | 'warn' | 'info', extra: any = {}) {
    const source = 'nodejs';
    let dd_logsEndpoint = `https://http-intake.logs.datadoghq.eu/api/v2/logs`;

    const host = request.headers.get('host') || '';

    const data = {
      ...{
        ddsource: source,
        ddtags: this.tags.join(',') + ',site:' + host,
        service: this.application,
        host: host,
        message,
        timestamp: Date.now(),
        http: {
          protocol: request.headers.get('X-Forwarded-Proto') || '',
          host: request.headers.get('host') || '',
          // status_code: response.status,
          method: request.method,
          url: request.url,
          referer: request.headers.get('referer') || '',
          useragent: request.headers.get('user-agent'),
        },
        network: {
          client: {geoip: {country: {iso_code: request.headers.get('Cf-Ipcountry')}}},
        },
        cloudflare: {
          ray: request.headers.get('cf-ray') || '',
          visitor: request.headers.get('cf-visitor') || '',
        },
      },
      ...extra,
    };

    await fetch(dd_logsEndpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: new Headers({
        'Content-Type': 'application/json',
        'DD-API-KEY': this.apiKey,
      }),
    });
  }
}
