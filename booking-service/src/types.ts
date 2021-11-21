export type Env = {
  BOOKINGS: DurableObjectNamespace;
  NETWORK_NAME: string;
  ENVIRONMENT: 'dev' | 'staging' | 'production';
  ETHEREUM_NODE: string;
  DATA_DOG_API_KEY: string;
  FINALITY?: string;
};

export type CronTrigger = {cron: string; scheduledTime: number};
