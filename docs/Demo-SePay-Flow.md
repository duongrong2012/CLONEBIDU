## SePay Online Payment - End-to-End Demo (Happy and Unhappy Paths)

### 1) End-to-end Happy Path

1) Seller creates a product (`PENDING`).  
2) Admin approves the product (`APPROVED`, `isActive=true`).  
3) Buyer gets an order preview.  
4) Buyer creates an order with `paymentMethod=ONLINE`, `paymentProvider=SEPAY`.  
5) Buyer calls `POST /payments/orders/{orderId}/initiate` to get QR/URL.  
6) Buyer transfers the exact amount with `DH{orderId}` within the time window.  
7) SePay calls the webhook → system records a `PaymentTransaction` (PAID) and updates the order to `PAID`.  
8) Done.

### 2) Order & Payment – Unhappy Cases and Test Scenarios

Note:
- Create Order reuses all Order Preview validations. To avoid duplicate testing, validate shared cases once via Order Preview;
  for Create Order, only run the extra scenarios listed under its section.

- **Order Preview (POST /buyer/order-preview)**
  1) Missing items → Request body without `items`; Expect 400 Validation.
  2) Invalid product id → `items[0].product = "abc"`; Expect 400 Validation.
  3) Product not found → valid ObjectId that does not exist; Expect 404 with field `items`.
  4) Ordering own product → product.createdBy == current user; Expect 400 with field `items`.
  5) Product inactive → `isActive = false`; Expect 400 with field `items`.
  6) Product not approved → `status != APPROVED`; Expect 400 with field `items`.
  7) Has variants, missing variantCombinationId → Expect 400 with field `items`.
  8) Has variants, invalid variantCombinationId → non-existent id; Expect 400 with field `items`.
  9) Has variants, variant out of stock → quantity = 0; Expect 400 with field `items`.
  10) Has variants, requested qty > variant stock → Expect 400 with field `items`.
  11) No variants, variantCombinationId provided → Expect 400 with field `items`.
  12) No variants, product out of stock → product.quantity = 0; Expect 400 with field `items`.
  13) No variants, requested qty > product stock → Expect 400 with field `items`.
  14) Duplicate line item (same product+variant) → two items identical; Expect 400 with field `items`.
  15) Voucher code format invalid → lowercase or contains both `_` and `-`; Expect 400 with field `voucherOrderCode` or `voucherShippingCode`.
  16) Same voucher used for order and shipping → codes equal; Expect 400 on both fields.
  17) Voucher not found → unknown code; Expect 404 with field of that voucher.
  18) Voucher inactive/not approved → Expect 400 for that voucher field.
  19) Voucher not yet active or expired → Expect 400 for that voucher field.
  20) Global usage limit reached → `currentUsage >= quantity`; Expect 400 for that voucher field.
  21) Per-user usage limit reached → Expect 400 for that voucher field.
  22) applicableUsers mismatch → current user not in list; Expect 403 for that voucher field.
  23) applicableSellers mismatch → no item belongs to allowed sellers; Expect 400 for that voucher field.
  24) Voucher item scope mismatch (products/categories) → no eligible items; Expect 400 diagnostics.
  25) Min order value (order voucher) not met → subtotal < min; Expect 400 on `voucherOrderCode`.
  26) Min order value (shipping voucher) not met → shippingFee < min; Expect 400 on `voucherShippingCode`.

- **Create Order (POST /buyer/orders) – Additional only (reuses Order Preview validations)**
  27) Missing paymentMethod → Expect 400 with field `paymentMethod`.
  28) Invalid paymentMethod → not in enum; Expect 400 with field `paymentMethod`.
  29) ONLINE without paymentProvider → Expect 400 with field `paymentProvider`.
  30) ONLINE with invalid paymentProvider → not in enum; Expect 400 with field `paymentProvider`.
  31) Voucher became unavailable during transaction → Expect error and aborted transaction.
  32) Voucher usage limits reached during transaction → Expect error and aborted transaction.
  33) Inventory changed (insufficient stock) during transaction → Expect error and aborted transaction.

- **Payment Initiate (POST /payments/orders/{orderId}/initiate)**
  34) Invalid orderId (not MongoId) → Expect 400.
  35) Order not owned by user or not found → Expect 400 "Order not found".
  36) Order already PAID → Expect 400 "Order already paid".
  37) Order CANCELLED → Expect 400 "Cannot pay for a cancelled order".
  38) Order payment method not ONLINE → Expect 400 "Order payment method must be ONLINE".
  39) Order missing paymentProvider → Expect 400 "Order does not have a payment provider configured".
  40) Payment window expired → Expect 400 with field `order`.

- **Webhook (POST /payments/sepay/webhook)**
  41) Webhook auth failed (invalid/missing API key or IP not allowed) → API returns 200; skip processing; no state change.
  42) Duplicate providerTransactionId → No new transaction; API returns 200.
  43) Order already PAID → New transaction created with status FAILED (ORDER_ALREADY_PAID); API 200; Order unchanged.
  44) Wrong amount → New transaction created with status FAILED (AMOUNT_MISMATCH); API 200; Order unchanged (or paymentStatus=FAILED if not PAID).
  45) Payment window expired → New transaction created with status FAILED (PAYMENT_WINDOW_EXPIRED); API 200; Order unchanged (or paymentStatus=FAILED if not PAID).

