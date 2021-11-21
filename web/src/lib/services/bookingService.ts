import {BOOKING_SERVICE_URL} from '$lib/config';
import {AutoStartBaseStore} from '$lib/utils/stores/base';

type Booking = {
  address: string;
  ip: string;
  bleep: number;
  transaction?: {hash: string; confirmed: number};
  passId?: number;
  timestamp: number;
};

export type BookingServiceState = {
  state: 'Loading' | 'Idle' | 'Ready';
  list?: Booking[];
  error?: any;
};

class BookingServiceStore extends AutoStartBaseStore<BookingServiceState> {
  _timeout: NodeJS.Timeout;
  _stopped: boolean;
  _lastWallet?: string;
  _unsubscribeFromWallet?: () => void;

  async book(bookingSubmission: {
    address: string;
    transactionHash?: string;
    pass?: {
      id: number;
      to: string;
      signature: string;
    };
    bleep: number;
  }): Promise<void> {
    const bookingResponse = await fetch(`${BOOKING_SERVICE_URL}/book`, {
      method: 'POST',
      body: JSON.stringify(bookingSubmission),
    });
    const result = await bookingResponse.json();
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  constructor() {
    super({state: 'Idle'});
  }

  triggerUpdate() {
    this._clearTimeoutIfAny();
    this._check();
  }

  acknowledgeError(): void {
    this.setPartial({error: undefined});
  }

  _onStart() {
    this._stopped = false;
    this.setPartial({state: 'Loading'});
    this._check();
    return this._stop.bind(this);
  }

  _clearTimeoutIfAny() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }

  _stop() {
    if (this._unsubscribeFromWallet) {
      this._unsubscribeFromWallet();
      this._unsubscribeFromWallet = undefined;
    }
    this._clearTimeoutIfAny();
    this._stopped = true;
  }

  async _check() {
    try {
      const listResponse = await fetch(`${BOOKING_SERVICE_URL}/list`, {
        method: 'GET',
      });
      const result = await listResponse.json();

      const list = result.list;

      this.setPartial({
        state: 'Ready',
        list,
      });
    } catch (e) {
      console.error(e);
    }

    if (!this._stopped) {
      this._timeout = setTimeout(this._check.bind(this), 1000);
    }
  }
}

export const bookingService = new BookingServiceStore();
