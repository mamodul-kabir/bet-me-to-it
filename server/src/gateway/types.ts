export interface OrgPrivateKeyJwk {
  kty: string;
  crv: string;
  x: string;
  y: string;
  d: string;
}

export interface OrgApiKeyFile {
  key_id: string;
  label: string;
  fingerprint: string;
  created_at: string;
  private_key: OrgPrivateKeyJwk;
}

export interface SignerKeyFile {
  external_ref_id: string;
  signer_public_key: string;
  signer_private_key: string;
}

export interface GatewayAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
}

export interface DecodedOrgTokenPayload {
  iss: string;
  sub: string;
  exp: number;
  iat: number;
  jti: string;
  v?: string;
  uid?: string;
  role?: string;
  tm: {
    apikey_id: string;
    auth_method: string;
    organization_id: string;
  };
}

export interface UserWallet {
  address: string;
  chain_family: 'evm' | 'solana' | string;
}

export interface GatewayUser {
  user_id: string;
  external_ref_id: string;
  created_at: string;
  wallets: UserWallet[];
}

export interface GatewayBalance {
  asset_id: string;
  economic_asset_id: string;
  symbol: string;
  name: string;
  venue: string;
  chain: string;
  address: string;
  decimals: number;
  total: string;
  available: string;
  held: string;
  stable: boolean;
  tradeable: boolean;
}

export interface GatewayBalanceResponse {
  data: GatewayBalance[];
}

export interface GatewayPayload {
  payload: string;
  [key: string]: any;
}

export interface OrderRequest {
  asset_id: string;
  qty: string;
  qty_unit?: 'base' | 'quote';
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  price?: string;
}

export interface OrderResponse {
  id: string;
  order_id?: string;
  status: string;
  payloads?: GatewayPayload[];
  fills?: any[];
  [key: string]: any;
}

export interface TransferRequest {
  destination_address: string;
  amount: string;
  asset_id: string;
  chain?: string;
}

export interface TransferResponse {
  id: string;
  transfer_id?: string;
  status: string;
  payloads?: GatewayPayload[];
  [key: string]: any;
}

export interface ExecutePayloadRequest {
  signatures: string[];
  auth_type: 'api_key';
}

