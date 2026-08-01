export type TabMessage =
	| {type: 'LEADER_ANNOUNCE'; tabId: string; timestamp: number}
	| {type: 'LEADER_HEARTBEAT'; tabId: string; timestamp: number}
	| {type: 'LEADER_RESIGN'; tabId: string; timestamp: number};

export type TabLeaderService = {
	isLeader: {subscribe: (run: (value: boolean) => void) => () => void};
	start(): void;
	stop(): void;
};
