import { config } from '../config/env.js';
import { getOrgToken, getOrganizationId } from './auth.js';
import { signPayloads, getSignerExternalRefId, getSignerPublicKey } from './signer.js';
import type {
  GatewayUser,
  GatewayBalance,
  GatewayBalanceResponse,
  OrderRequest,
  OrderResponse,
  TransferRequest,
  TransferResponse,
  ExecutePayloadRequest,
} from './types.js';

export class GatewayClient {
  private baseUrl: string;
  private currentUserId: string | null = null;
  private cachedUser: GatewayUser | null = null;

  constructor(baseUrl: string = config.trueMarketsBaseUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  public setUserId(userId: string) {
    this.currentUserId = userId;
  }

  public getUserId(): string | null {
    return this.currentUserId;
  }

  public getCachedUser(): GatewayUser | null {
    return this.cachedUser;
  }

  /**
   * Helper to perform authenticated requests to the True Markets API.
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireUserContext: boolean = false
  ): Promise<T> {
    const token = await getOrgToken();
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (requireUserContext) {
      if (!this.currentUserId) {
        await this.ensureUserInitialized();
      }
      if (this.currentUserId) {
        headers['TM-On-Behalf-Of'] = this.currentUserId;
      }
    }

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson: any;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = { message: errorText };
      }
      const err = new Error(
        `Gateway API Error [${response.status} ${response.statusText}] at ${endpoint}: ${errorJson.message || errorText}`
      );
      (err as any).status = response.status;
      (err as any).data = errorJson;
      throw err;
    }

    return (await response.json()) as T;
  }

  /**
   * Create or fetch the user associated with the local signer key.
   * Auto-provisions Solana and EVM wallets under the organization.
   */
  public async getOrCreateUser(
    externalRefId: string = getSignerExternalRefId(),
    signerPublicKey: string = getSignerPublicKey()
  ): Promise<GatewayUser> {
    if (this.cachedUser && this.cachedUser.external_ref_id === externalRefId) {
      this.currentUserId = this.cachedUser.user_id;
      return this.cachedUser;
    }

    const orgId = await getOrganizationId();
    const endpoint = `/v1/account/organizations/${orgId}/users`;

    let maxRetries = 3;
    let delayMs = 2000;

    while (maxRetries > 0) {
      try {
        const user = await this.request<GatewayUser>(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            external_ref_id: externalRefId,
            signer_public_key: signerPublicKey,
          }),
        });

        this.cachedUser = user;
        this.currentUserId = user.user_id;
        return user;
      } catch (err: any) {
        if (err.status === 503 && maxRetries > 1) {
          maxRetries--;
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        throw err;
      }
    }

    throw new Error('Failed to create or provision user after retries');
  }

  /**
   * Ensure user is initialized before making user-scoped Gateway calls.
   */
  public async ensureUserInitialized(): Promise<GatewayUser> {
    if (this.cachedUser && this.currentUserId) {
      return this.cachedUser;
    }
    return await this.getOrCreateUser();
  }

  /**
   * Fetch live unified balances across Solana and EVM for the active user.
   */
  public async getBalances(): Promise<GatewayBalance[]> {
    await this.ensureUserInitialized();
    const res = await this.request<GatewayBalanceResponse>(
      '/v1/gateway/balances',
      { method: 'GET' },
      true
    );
    return res.data || [];
  }

  /**
   * Fetch tradable assets catalog from True Markets Gateway.
   */
  public async getAssets(): Promise<any[]> {
    const res = await this.request<any>('/v1/gateway/assets', { method: 'GET' });
    return res.data || res || [];
  }

  /**
   * Fetch public DeFi price candles for charting and market prices.
   */
  public async getCandles(
    symbol: string,
    window: string = '1d',
    resolution: string = '1h'
  ): Promise<any> {
    const url = `${this.baseUrl}/v1/defi/market/prices/candles?symbol=${encodeURIComponent(
      symbol
    )}&window=${encodeURIComponent(window)}&resolution=${encodeURIComponent(resolution)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Candle API Error [${res.status}]: ${errText}`);
    }
    return await res.json();
  }

  /**
   * Submit an order (buy/sell crypto or tokenized stock), co-sign payloads, and execute.
   */
  public async createAndExecuteOrder(orderReq: OrderRequest): Promise<OrderResponse> {
    await this.ensureUserInitialized();

    // 1. Create order
    const created = await this.request<OrderResponse>(
      '/v1/gateway/orders',
      {
        method: 'POST',
        body: JSON.stringify(orderReq),
      },
      true
    );

    const orderId = created.id || created.order_id;

    // 2. If payloads require signing, sign and execute
    if (created.payloads && created.payloads.length > 0) {
      const signatures = await signPayloads(created.payloads);
      const execBody: ExecutePayloadRequest = {
        signatures,
        auth_type: 'api_key',
      };

      const executed = await this.request<OrderResponse>(
        `/v1/gateway/orders/${orderId}/execute`,
        {
          method: 'POST',
          body: JSON.stringify(execBody),
        },
        true
      );
      return executed;
    }

    return created;
  }

  /**
   * Submit a transfer/payment, co-sign payloads, and execute.
   */
  public async createAndExecuteTransfer(transferReq: {
    to: string;
    qty: string;
    asset_id: string;
    qty_unit?: string;
  }): Promise<TransferResponse> {
    await this.ensureUserInitialized();

    const body = {
      asset_id: transferReq.asset_id,
      qty: transferReq.qty,
      qty_unit: transferReq.qty_unit || 'base',
      to: transferReq.to,
    };

    // 1. Create transfer
    const created = await this.request<TransferResponse>(
      '/v1/gateway/transfers',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      true
    );

    const transferId = created.id || created.transfer_id;

    // 2. If payloads require signing, sign and execute
    if (created.payloads && created.payloads.length > 0) {
      const signatures = await signPayloads(created.payloads);
      const execBody: ExecutePayloadRequest = {
        signatures,
        auth_type: 'api_key',
      };

      const executed = await this.request<TransferResponse>(
        `/v1/gateway/transfers/${transferId}/execute`,
        {
          method: 'POST',
          body: JSON.stringify(execBody),
        },
        true
      );
      return executed;
    }

    return created;
  }

  /**
   * Fetch paginated list of user's orders.
   */
  public async getOrders(limit: number = 50): Promise<any> {
    await this.ensureUserInitialized();
    return await this.request<any>(
      `/v1/gateway/orders?limit=${limit}`,
      { method: 'GET' },
      true
    );
  }

  /**
   * Fetch paginated list of user's transfers.
   */
  public async getTransfers(limit: number = 50): Promise<any> {
    await this.ensureUserInitialized();
    return await this.request<any>(
      `/v1/gateway/transfers?limit=${limit}`,
      { method: 'GET' },
      true
    );
  }

  /**
   * Fetch unified transactions feed (orders + transfers + ramps).
   */
  public async getTransactions(type?: string, limit: number = 50): Promise<any> {
    await this.ensureUserInitialized();
    const query = type ? `?type=${type}&limit=${limit}` : `?limit=${limit}`;
    return await this.request<any>(
      `/v1/gateway/transactions${query}`,
      { method: 'GET' },
      true
    );
  }
}

// Export singleton instance
export const gatewayClient = new GatewayClient();
