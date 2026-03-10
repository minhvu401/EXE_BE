# Payment API Debug Guide

## Issue

Payment creation endpoint returns: `{"message": "fetch failed", "error": "Bad Request", "statusCode": 400}`

## Recent Improvements

I've enhanced error logging in `payos.service.ts` to capture more detailed PayOS API error responses. The new logs will show:

- HTTP status code and text
- Full error response body
- Request details (client ID, payload structure)

## Common Causes & Solutions

### 1. **PayOS API Credentials Issue** ✅ VERIFIED

**Status**: Credentials are configured in `.env`

- PAYOS_CLIENT_ID: `62761160-b7a4-44f3-b605-81e060968441`
- PAYOS_API_KEY: `bdb5eae3-dadd-4ec9-8d86-6da14ea9b805`
- PAYOS_CHECKSUM_KEY: `7807a954f945dedb7e0e250cad7e72ff84a12531c28bc8d3f16067e28dde62a8`
- PAYOS_API_URL: `https://api.payos.vn/v1`

**Action**: If credentials are expired or incorrect, regenerate from PayOS dashboard

---

### 2. **Invalid Return/Cancel URLs** ⚠️ CHECK THIS

The payment request uses URLs derived from the request hostname. For Render deployment:

- Expected format: `https://clubverse.onrender.com/payment/success`
- The URLs are built from: `${protocol}://${host}/payment/success?orderCode=${orderCode}`

**Possible Issue**:

- If the Host header is being mangled or invalid, PayOS might reject it
- Render might be forwarding a different hostname

**Debug**: Check server logs to see what `returnUrl` and `cancelUrl` are being sent to PayOS

**Fix if needed** - Add middleware to standardize the host:

```typescript
// In app.module.ts or a middleware
const appUrl = configService.get('APP_URL') || process.env.APP_URL;
// Then use this instead of deriving from request
```

---

### 3. **Signature Generation Error** ⚠️ POSSIBLE

PayOS uses HMAC-SHA256 signature validation. The signature is calculated as:

```
HMAC_SHA256(clientId;orderCode;amount;itemCount;description;cancelUrl;returnUrl, checksumKey)
```

**Debug Steps**:

1. Check that the payload sent to PayOS includes the signature
2. Verify signature calculation is consistent

**Verify signing** - The current code does:

```typescript
const itemCount = request.items.reduce((sum, item) => sum + item.quantity, 0);
const signatureString = `${clientId};${orderCode};${amount};${itemCount};${description};${cancelUrl};${returnUrl}`;
```

This looks correct, but **potential issues**:

- itemCount calculation (should be 1 for the test request)
- Special characters in description might need URL encoding
- Whitespace/encoding differences

---

### 4. **Request Body Validation**

The expected DTO matches your request:

```typescript
{
  amount: 50000,           // ✅ number
  description: "...",      // ✅ string
  packageType?: "..."      // ✅ optional string
}
```

---

## Debugging Steps

### Step 1: Enable Debug Logging

After the improvements, check server logs for detailed PayOS error. The new error should show:

```
PayOS API Error Response: {
  status: 400,
  statusText: "Bad Request",
  body: { /* actual PayOS error */ }
}
```

### Step 2: Test with cURL (with corrected URLs)

If running locally, the test should use `localhost:3000`:

```bash
curl -X POST http://localhost:3000/payments/create \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "description": "Thanh toán gói AI Premium",
    "packageType": "ai-premium-monthly"
  }'
```

### Step 3: Verify PayOS Configuration

Go to PayOS dashboard and check:

- [ ] API credentials are active and not revoked
- [ ] Your IP/domain is whitelisted (if applicable)
- [ ] Test payment amount is within allowed range
- [ ] Description doesn't contain invalid characters

### Step 4: Check Return URL Whitelist

Some payment gateways require return URLs to be whitelisted. Check PayOS dashboard to ensure:

- `https://clubverse.onrender.com/payment/success` is whitelisted
- `https://clubverse.onrender.com/payment/cancel` is whitelisted

---

## Next Steps

1. **Redeploy** with the improved error logging
2. **Trigger** a payment creation request again
3. **Check** server logs for the detailed PayOS error response
4. **Share** the error response details - that will identify the exact issue

The PayOS error message will tell us exactly what's wrong (e.g., "Invalid signature", "Invalid amount", "Duplicate orderCode", etc.)

---

## Additional Files to Check

- [Payment Controller](src/modules/payment/payment.controller.ts)
- [Payment Service](src/modules/payment/payment.service.ts)
- [PayOS Service](src/modules/payment/payos.service.ts) - **UPDATED WITH BETTER ERROR LOGGING**
