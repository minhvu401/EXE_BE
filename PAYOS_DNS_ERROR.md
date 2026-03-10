# PayOS Payment Error - DNS Resolution Issue

## Problem

```
ERROR [PayOSService] PayOS Fetch Error (Network):
error: 'fetch failed'
```

DNS resolution test results:

- ❌ `api.payos.vn` - Cannot resolve
- ✅ `payos.vn` - Resolves to 180.93.182.49
- ✅ `google.com` - Resolves to 142.250.198.46

## Root Cause

The API endpoint URL `https://api.payos.vn/v1` in `.env` cannot be resolved via DNS.

## Solutions

### Solution 1: Check PayOS Endpoint (RECOMMENDED)

1. Go to PayOS Dashboard: https://dashboard.payos.vn
2. Check **Settings → API Keys** section
3. Find the correct **API Endpoint URL**
4. Update `.env`:
   ```
   PAYOS_API_URL=<correct_url_from_dashboard>
   ```

### Solution 2: Common PayOS Endpoints to Try

```env
# Try one of these if dashboard doesn't specify:
PAYOS_API_URL=https://api.payos.vn/v1
PAYOS_API_URL=https://payos.vn/api/v1
PAYOS_API_URL=https://api.payos.vn
PAYOS_API_URL=https://merchant-api.payos.vn/v1
```

### Solution 3: Network/Firewall Check

If DNS is the issue, check:

- ISP firewall blocking `api.payos.vn`
- Company network/VPN restrictions
- Local DNS settings

**Windows DNS Flush:**

```powershell
ipconfig /flushdns
```

### Solution 4: Contact PayOS Support

If none of the above work, contact PayOS support with:

- Error: "DNS cannot resolve api.payos.vn"
- Ask for: Correct API endpoint URL and any IP whitelist requirements

## Testing After Fix

1. Update `.env` with correct endpoint
2. Rebuild: `pnpm build`
3. Restart server: `npm run start`
4. Test payment creation endpoint
5. Check logs for new errors

## Current Configuration

```env
PAYOS_CLIENT_ID=62761160-b7a4-44f3-b605-81e060968441
PAYOS_API_KEY=bdb5eae3-dadd-4ec9-8d86-6da14ea9b805
PAYOS_CHECKSUM_KEY=7807a954f945dedb7e0e250cad7e72ff84a12531c28bc8d3f16067e28dde62a8
PAYOS_API_URL=https://api.payos.vn/v1  # ⚠️ ISSUE: Cannot resolve this domain
```
