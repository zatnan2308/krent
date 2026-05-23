import { getPayPalConfig, type PayPalRuntimeConfig } from "../config";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  HandleWebhookInput,
  HandleWebhookResult,
  PaymentProvider,
  RefundPaymentInput,
  RefundPaymentResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from "../provider";

interface OrderResponse {
  id: string;
  status: string;
  links?: { href: string; rel: string; method: string }[];
  purchase_units?: {
    payments?: { captures?: { id: string; status: string }[] };
  }[];
}

interface WebhookEventBody {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown>;
}

/** Получает OAuth access_token PayPal (валиден ~9 часов; кеш в памяти процесса). */
let tokenCache: { token: string; exp: number } | null = null;

async function getAccessToken(config: PayPalRuntimeConfig): Promise<string | null> {
  const now = Date.now();
  if (tokenCache && tokenCache.exp - now > 60_000) {
    return tokenCache.token;
  }
  const basic = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
    "utf8",
  ).toString("base64");
  try {
    const response = await fetch(`${config.apiBase}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${basic}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!response.ok) {
      return null;
    }
    const json = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    if (!json.access_token) {
      return null;
    }
    tokenCache = {
      token: json.access_token,
      exp: now + (json.expires_in ?? 3600) * 1000,
    };
    return json.access_token;
  } catch {
    return null;
  }
}

async function createOrder(
  config: PayPalRuntimeConfig,
  input: CreatePaymentInput,
): Promise<OrderResponse | null> {
  const token = await getAccessToken(config);
  if (!token) {
    return null;
  }
  try {
    const response = await fetch(`${config.apiBase}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.booking.reference,
            description: input.booking.description.slice(0, 127),
            custom_id: input.rentalPaymentId,
            amount: {
              currency_code: input.booking.currency,
              value: input.booking.amount.toFixed(2),
            },
          },
        ],
        application_context: {
          return_url: input.successUrl,
          cancel_url: input.cancelUrl,
          user_action: "PAY_NOW",
          shipping_preference: "NO_SHIPPING",
        },
      }),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as OrderResponse;
  } catch {
    return null;
  }
}

async function captureOrder(
  config: PayPalRuntimeConfig,
  orderId: string,
): Promise<OrderResponse | null> {
  const token = await getAccessToken(config);
  if (!token) {
    return null;
  }
  try {
    const response = await fetch(
      `${config.apiBase}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          // Идемпотентность по orderId: повторный capture той же ссылки безопасен.
          "paypal-request-id": `capture-${orderId}`,
        },
      },
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as OrderResponse;
  } catch {
    return null;
  }
}

async function getOrder(
  config: PayPalRuntimeConfig,
  orderId: string,
): Promise<OrderResponse | null> {
  const token = await getAccessToken(config);
  if (!token) {
    return null;
  }
  try {
    const response = await fetch(
      `${config.apiBase}/v2/checkout/orders/${orderId}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as OrderResponse;
  } catch {
    return null;
  }
}

async function refundCapture(
  config: PayPalRuntimeConfig,
  captureId: string,
  amount: number,
  currency: string,
): Promise<{ id: string; status: string } | null> {
  const token = await getAccessToken(config);
  if (!token) {
    return null;
  }
  try {
    const response = await fetch(
      `${config.apiBase}/v2/payments/captures/${captureId}/refund`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          amount: { currency_code: currency, value: amount.toFixed(2) },
        }),
      },
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as { id: string; status: string };
  } catch {
    return null;
  }
}

async function verifyWebhookSignature(
  config: PayPalRuntimeConfig,
  rawBody: string,
  headers: Record<string, string | null>,
): Promise<boolean> {
  if (!config.webhookId) {
    return false;
  }
  const token = await getAccessToken(config);
  if (!token) {
    return false;
  }
  try {
    const response = await fetch(
      `${config.apiBase}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: headers["paypal-auth-algo"],
          cert_url: headers["paypal-cert-url"],
          transmission_id: headers["paypal-transmission-id"],
          transmission_sig: headers["paypal-transmission-sig"],
          transmission_time: headers["paypal-transmission-time"],
          webhook_id: config.webhookId,
          webhook_event: JSON.parse(rawBody) as unknown,
        }),
      },
    );
    if (!response.ok) {
      return false;
    }
    const json = (await response.json()) as { verification_status?: string };
    return json.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}

/** Полная реализация PayPal через REST API (orders v2 + webhooks v1). */
export function createPayPalProvider(): PaymentProvider {
  const config = getPayPalConfig();
  return {
    type: "paypal",

    async createPayment(input): Promise<CreatePaymentResult> {
      if (!config) {
        return {
          kind: "unavailable",
          message: "PayPal is not configured on this installation.",
        };
      }
      const order = await createOrder(config, input);
      if (!order) {
        return {
          kind: "unavailable",
          message: "Could not create a PayPal order. Try another method.",
        };
      }
      const approve = order.links?.find((link) => link.rel === "approve");
      if (!approve) {
        return {
          kind: "unavailable",
          message: "PayPal did not return a checkout URL.",
        };
      }
      return { kind: "redirect", url: approve.href, reference: order.id };
    },

    async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
      if (!config) {
        return { status: "unsupported" };
      }
      const order = await getOrder(config, input.reference);
      if (!order) {
        return { status: "pending" };
      }
      if (order.status === "COMPLETED") {
        return { status: "succeeded" };
      }
      if (order.status === "VOIDED" || order.status === "DECLINED") {
        return { status: "failed" };
      }
      return { status: "pending" };
    },

    async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentResult> {
      if (!config) {
        return {
          ok: false,
          manual: true,
          message: "PayPal is not configured for refunds.",
        };
      }
      const captureId = input.providerTransactionId ?? input.providerReference;
      if (!captureId) {
        return {
          ok: false,
          manual: true,
          message: "Capture ID is required for PayPal refund.",
        };
      }
      const refund = await refundCapture(
        config,
        captureId,
        input.amount,
        input.currency,
      );
      if (!refund) {
        return {
          ok: false,
          manual: true,
          message: "PayPal refund call failed; process manually.",
        };
      }
      return {
        ok: true,
        providerRefundId: refund.id,
        status: refund.status === "COMPLETED" ? "succeeded" : "pending",
      };
    },

    async handleWebhook(input: HandleWebhookInput): Promise<HandleWebhookResult> {
      if (!config) {
        return {
          verified: false,
          eventId: null,
          eventType: null,
          outcome: "ignored",
          providerReference: null,
          metadata: {},
          error: "PayPal is not configured.",
        };
      }
      const headers = parseHeaders(input.signature);
      const verified = await verifyWebhookSignature(
        config,
        input.rawBody,
        headers,
      );
      let body: WebhookEventBody = {};
      try {
        body = JSON.parse(input.rawBody) as WebhookEventBody;
      } catch {
        body = {};
      }
      const eventType = body.event_type ?? null;
      const resource = body.resource ?? {};
      const providerReference =
        readResourceString(resource, "id") ??
        readResourceString(resource, "supplementary_data", "related_ids", "order_id");
      const customId = readResourceString(resource, "custom_id");
      const metadata: Record<string, string> = {};
      if (customId) {
        metadata.rental_payment_id = customId;
      }
      const outcome: HandleWebhookResult["outcome"] =
        eventType === "PAYMENT.CAPTURE.COMPLETED" ||
        eventType === "CHECKOUT.ORDER.APPROVED"
          ? "payment_succeeded"
          : eventType === "PAYMENT.CAPTURE.DENIED" ||
              eventType === "PAYMENT.CAPTURE.REVERSED"
            ? "payment_failed"
            : "ignored";
      return {
        verified,
        eventId: body.id ?? null,
        eventType,
        outcome,
        providerReference,
        metadata,
        error: verified ? null : "PayPal webhook signature could not be verified.",
      };
    },
  };
}

/** Парсит signature-payload, который Stripe-маршрут передаёт как одну строку. */
function parseHeaders(serialised: string | null): Record<string, string | null> {
  if (!serialised) {
    return {};
  }
  try {
    return JSON.parse(serialised) as Record<string, string | null>;
  } catch {
    return {};
  }
}

function readResourceString(
  resource: Record<string, unknown>,
  ...path: string[]
): string | null {
  let current: unknown = resource;
  for (const segment of path) {
    if (current && typeof current === "object" && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  return typeof current === "string" ? current : null;
}

/**
 * Captures a PayPal order after the user returns from approval.
 * Используется server-action'ом /api/payments/paypal/capture.
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  ok: boolean;
  status: string;
  captureId: string | null;
}> {
  const config = getPayPalConfig();
  if (!config) {
    return { ok: false, status: "unavailable", captureId: null };
  }
  const order = await captureOrder(config, orderId);
  if (!order) {
    return { ok: false, status: "failed", captureId: null };
  }
  const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    ok: order.status === "COMPLETED",
    status: order.status,
    captureId: capture?.id ?? null,
  };
}
