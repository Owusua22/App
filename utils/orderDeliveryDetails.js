const normalizeFieldName = (value) =>
  String(value ?? "").replace(/[^a-z0-9]/gi, "").toLowerCase();

const isUsableFieldValue = (value) => {
  if (value == null) return false;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return Boolean(
      normalized &&
        !["n/a", "na", "not available", "not provided", "null", "undefined"].includes(
          normalized
        )
    );
  }
  return typeof value === "number" || typeof value === "object";
};

function getObjectField(source, aliases) {
  if (!source || typeof source !== "object" || Array.isArray(source)) return null;
  const names = new Set(aliases.map(normalizeFieldName));
  for (const [key, value] of Object.entries(source)) {
    if (names.has(normalizeFieldName(key)) && isUsableFieldValue(value)) return value;
  }
  return null;
}

function toDisplayText(value, visited = new Set()) {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return isUsableFieldValue(text) ? text : null;
  }
  if (!value || typeof value !== "object" || visited.has(value)) return null;
  visited.add(value);

  if (Array.isArray(value)) {
    const text = value
      .map((part) => toDisplayText(part, visited))
      .filter(Boolean)
      .join(", ");
    return text || null;
  }

  const firstName = toDisplayText(
    getObjectField(value, ["firstName", "givenName"]),
    visited
  );
  const lastName = toDisplayText(
    getObjectField(value, ["lastName", "familyName", "surname"]),
    visited
  );
  if (firstName || lastName) return [firstName, lastName].filter(Boolean).join(" ");

  const preferred = getObjectField(value, [
    "formattedAddress",
    "fullAddress",
    "addressLine",
    "addressLine1",
    "streetAddress",
    "gpsAddress",
    "digitalAddress",
    "address",
    "name",
    "value",
    "text",
    "description",
  ]);
  if (preferred != null && preferred !== value) {
    const text = toDisplayText(preferred, visited);
    if (text) return text;
  }

  const parts = [
    "houseNumber",
    "line1",
    "line2",
    "street",
    "streetName",
    "area",
    "suburb",
    "community",
    "locality",
    "town",
    "townName",
    "city",
    "district",
    "region",
    "regionName",
    "country",
  ]
    .map((field) => toDisplayText(getObjectField(value, [field]), visited))
    .filter(Boolean);
  return parts.length ? [...new Set(parts)].join(", ") : null;
}

const API_CONTAINER_KEYS = new Set([
  "data",
  "result",
  "results",
  "value",
  "values",
  "$values",
  "items",
  "deliveryaddress",
  "deliveryaddresses",
  "orderdelivery",
  "orderdeliveryaddress",
  "orderdeliverydetails",
  "deliverydetails",
  "delivery",
  "receiverdetails",
  "receiverinfo",
  "recipientdetails",
  "recipientinfo",
  "addressdetails",
  "addressinfo",
  "shippingaddress",
  "shippingdetails",
  "deliverylocation",
  "contactdetails",
  "customerdetails",
  "address",
  "customer",
  "recipient",
  "receiver",
  "order",
  "salesorder",
]);

export function collectApiRecords(value, records = [], visited = new Set(), depth = 0) {
  if (depth > 5 || value == null) return records;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectApiRecords(entry, records, visited, depth + 1));
    return records;
  }
  if (typeof value !== "object" || visited.has(value)) return records;
  visited.add(value);
  records.push(value);

  Object.entries(value).forEach(([key, nested]) => {
    if (API_CONTAINER_KEYS.has(normalizeFieldName(key))) {
      collectApiRecords(nested, records, visited, depth + 1);
    }
  });
  return records;
}

export function resolveDeliveryDetails(orderPayload, deliveryPayload) {
  // SalesOrderGet contains the customer-facing invoice fields. Prefer it over
  // the separate delivery-address response, then use delivery data as fallback.
  const records = [
    ...collectApiRecords(orderPayload),
    ...collectApiRecords(deliveryPayload),
  ];
  const findValue = (aliases) => {
    for (const record of records) {
      const value = getObjectField(record, aliases);
      const text = toDisplayText(value);
      if (text) return text;
    }
    return null;
  };

  return {
    recipientName: findValue([
      "recipientName",
      "recipientFullName",
      "fullName",
      "receiverName",
      "receiverFullName",
      "deliveryRecipientName",
      "deliveryName",
      "recipient",
      "receiver",
      "customerName",
      "name",
    ]),
    recipientContactNumber: findValue([
      "recipientContactNumber",
      "recipientPhoneNumber",
      "recipientPhone",
      "recipientMobileNumber",
      "receiverContactNumber",
      "receiverPhoneNumber",
      "contactNumber",
      "contactNo",
      "mobileNumber",
      "mobileNo",
      "phoneNumber",
      "phoneNo",
      "telephoneNumber",
      "telephone",
      "phone",
      "contact",
    ]),
    address: findValue([
      "address",
      "deliveryAddress",
      "recipientAddress",
      "deliveryAddressDetails",
      "addressDetails",
      "fullAddress",
      "formattedAddress",
      "addressLine",
      "addressLine1",
      "streetAddress",
      "deliveryLocation",
      "shippingAddress",
      "physicalAddress",
      "gpsAddress",
      "digitalAddress",
      "location",
    ]),
    orderNote: findValue(["orderNote", "deliveryNote", "note"]),
  };
}
