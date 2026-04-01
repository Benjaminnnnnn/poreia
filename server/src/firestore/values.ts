type FirestoreScalar =
  | null
  | string
  | number
  | boolean
  | Date
  | FirestoreScalar[]
  | { [key: string]: FirestoreScalar };

interface FirestoreValue {
  arrayValue?: { values?: FirestoreValue[] };
  booleanValue?: boolean;
  doubleValue?: number;
  integerValue?: string;
  mapValue?: { fields?: Record<string, FirestoreValue> };
  nullValue?: null;
  stringValue?: string;
  timestampValue?: string;
}

export interface FirestoreDocument<T> {
  createTime?: string;
  data: T;
  name: string;
  updateTime?: string;
}

function encodeValue(value: FirestoreScalar): FirestoreValue {
  if (value === null) {
    return { nullValue: null };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => encodeValue(entry)),
      },
    };
  }

  switch (typeof value) {
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      return Number.isInteger(value)
        ? { integerValue: String(value) }
        : { doubleValue: value };
    case 'string':
      return { stringValue: value };
    case 'object':
      return {
        mapValue: {
          fields: encodeFields(value),
        },
      };
    default:
      throw new Error(`Unsupported Firestore value type: ${typeof value}`);
  }
}

export function encodeFields(value: Record<string, FirestoreScalar>): Record<string, FirestoreValue> {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, encodeValue(entry)]),
  );
}

function decodeValue(value: FirestoreValue): unknown {
  if ('stringValue' in value && value.stringValue !== undefined) {
    return value.stringValue;
  }

  if ('timestampValue' in value && value.timestampValue !== undefined) {
    return value.timestampValue;
  }

  if ('booleanValue' in value && value.booleanValue !== undefined) {
    return value.booleanValue;
  }

  if ('integerValue' in value && value.integerValue !== undefined) {
    return Number(value.integerValue);
  }

  if ('doubleValue' in value && value.doubleValue !== undefined) {
    return value.doubleValue;
  }

  if ('nullValue' in value) {
    return null;
  }

  if ('arrayValue' in value && value.arrayValue) {
    return (value.arrayValue.values ?? []).map((entry) => decodeValue(entry));
  }

  if ('mapValue' in value && value.mapValue) {
    return decodeFields(value.mapValue.fields ?? {});
  }

  return null;
}

export function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, entry]) => [key, decodeValue(entry)]),
  );
}

export function decodeDocument<T>(document: {
  createTime?: string;
  fields?: Record<string, FirestoreValue>;
  name: string;
  updateTime?: string;
}): FirestoreDocument<T> {
  return {
    createTime: document.createTime,
    data: decodeFields(document.fields ?? {}) as T,
    name: document.name,
    updateTime: document.updateTime,
  };
}
