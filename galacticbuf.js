// galacticbuf.js
// Реализация протокола GalacticBuf для Node.js

const VERSION = 0x01;

const TYPE_INT = 0x01;
const TYPE_STRING = 0x02;
const TYPE_LIST = 0x03;
const TYPE_OBJECT = 0x04;

function getTypeCodeForValue(value) {
  if (typeof value === 'bigint' || (typeof value === 'number' && Number.isInteger(value))) {
    return TYPE_INT;
  }
  if (typeof value === 'string') {
    return TYPE_STRING;
  }
  if (Array.isArray(value)) {
    return TYPE_LIST;
  }
  if (value && typeof value === 'object') {
    return TYPE_OBJECT;
  }
  throw new Error('Unsupported value type: ' + String(value));
}

// ---------- ENCODE ----------

function encodeIntValue(value) {
  const buf = Buffer.alloc(8);
  const big = typeof value === 'bigint' ? value : BigInt(value);
  buf.writeBigInt64BE(big, 0);
  return buf;
}

function encodeStringValue(str) {
  const data = Buffer.from(str, 'utf8');
  if (data.length > 0xffff) {
    throw new Error('String too long');
  }
  const buf = Buffer.alloc(2 + data.length);
  buf.writeUInt16BE(data.length, 0);
  data.copy(buf, 2);
  return buf;
}

function encodeObjectValue(obj) {
  const fieldNames = Object.keys(obj);
  if (fieldNames.length > 0xff) {
    throw new Error('Too many fields in object');
  }

  const parts = [];
  const header = Buffer.alloc(1);
  header.writeUInt8(fieldNames.length, 0);
  parts.push(header);

  for (const name of fieldNames) {
    const value = obj[name];
    parts.push(encodeField(name, value));
  }

  return Buffer.concat(parts);
}

function encodeListValue(arr) {
  const len = arr.length;
  if (len > 0xffff) {
    throw new Error('List too long');
  }
  if (len === 0) {
    // Для простоты: пустой список считаем списком int
    const header = Buffer.alloc(3);
    header.writeUInt8(TYPE_INT, 0);
    header.writeUInt16BE(0, 1);
    return header;
  }

  const elemType = getTypeCodeForValue(arr[0]);
  if (![TYPE_INT, TYPE_STRING, TYPE_OBJECT].includes(elemType)) {
    throw new Error('List elements must be int, string or object');
  }

  const header = Buffer.alloc(3);
  header.writeUInt8(elemType, 0);
  header.writeUInt16BE(len, 1);

  const parts = [header];

  for (const el of arr) {
    const t = getTypeCodeForValue(el);
    if (t !== elemType) {
      throw new Error('All list elements must have same type');
    }
    let buf;
    if (elemType === TYPE_INT) {
      buf = encodeIntValue(el);
    } else if (elemType === TYPE_STRING) {
      buf = encodeStringValue(el);
    } else if (elemType === TYPE_OBJECT) {
      buf = encodeObjectValue(el);
    }
    parts.push(buf);
  }

  return Buffer.concat(parts);
}

function encodeField(name, value) {
  const nameBytes = Buffer.from(name, 'utf8');
  if (nameBytes.length > 0xff) {
    throw new Error('Field name too long');
  }

  const nameLenBuf = Buffer.alloc(1);
  nameLenBuf.writeUInt8(nameBytes.length, 0);

  const type = getTypeCodeForValue(value);
  const typeBuf = Buffer.alloc(1);
  typeBuf.writeUInt8(type, 0);

  let valueBuf;
  if (type === TYPE_INT) {
    valueBuf = encodeIntValue(value);
  } else if (type === TYPE_STRING) {
    valueBuf = encodeStringValue(value);
  } else if (type === TYPE_LIST) {
    valueBuf = encodeListValue(value);
  } else if (type === TYPE_OBJECT) {
    valueBuf = encodeObjectValue(value);
  } else {
    throw new Error('Unknown type');
  }

  return Buffer.concat([nameLenBuf, nameBytes, typeBuf, valueBuf]);
}

function encodeMessage(obj) {
  const fieldNames = Object.keys(obj);
  if (fieldNames.length > 0xff) {
    throw new Error('Too many fields in message');
  }

  const fieldBuffers = [];
  for (const name of fieldNames) {
    fieldBuffers.push(encodeField(name, obj[name]));
  }

  const body = Buffer.concat(fieldBuffers);
  const totalLength = 4 + body.length;
  if (totalLength > 0xffff) {
    throw new Error('Message too long');
  }

  const header = Buffer.alloc(4);
  header.writeUInt8(VERSION, 0);
  header.writeUInt8(fieldNames.length, 1);
  header.writeUInt16BE(totalLength, 2);

  return Buffer.concat([header, body]);
}

// ---------- DECODE ----------

function bigIntToJs(bi) {
  const min = BigInt(Number.MIN_SAFE_INTEGER);
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  if (bi >= min && bi <= max) {
    return Number(bi);
  }
  return bi; // вернем BigInt если слишком большое
}

function readIntValue(buf, offset) {
  const bi = buf.readBigInt64BE(offset);
  return { value: bigIntToJs(bi), offset: offset + 8 };
}

function readStringValue(buf, offset) {
  const length = buf.readUInt16BE(offset);
  offset += 2;
  const end = offset + length;
  const str = buf.slice(offset, end).toString('utf8');
  return { value: str, offset: end };
}

function readObjectValue(buf, offset) {
  const fieldCount = buf.readUInt8(offset);
  offset += 1;

  const obj = {};
  for (let i = 0; i < fieldCount; i++) {
    const res = readField(buf, offset);
    obj[res.name] = res.value;
    offset = res.offset;
  }
  return { value: obj, offset };
}

function readListValue(buf, offset) {
  const elemType = buf.readUInt8(offset);
  offset += 1;
  const count = buf.readUInt16BE(offset);
  offset += 2;

  const arr = [];
  for (let i = 0; i < count; i++) {
    let parsed;
    if (elemType === TYPE_INT) {
      parsed = readIntValue(buf, offset);
    } else if (elemType === TYPE_STRING) {
      parsed = readStringValue(buf, offset);
    } else if (elemType === TYPE_OBJECT) {
      parsed = readObjectValue(buf, offset);
    } else {
      throw new Error('Unsupported list element type: ' + elemType);
    }
    arr.push(parsed.value);
    offset = parsed.offset;
  }

  return { value: arr, offset };
}

function readField(buf, offset) {
  const nameLen = buf.readUInt8(offset);
  offset += 1;
  const nameEnd = offset + nameLen;
  const name = buf.slice(offset, nameEnd).toString('utf8');
  offset = nameEnd;

  const type = buf.readUInt8(offset);
  offset += 1;

  let parsed;
  if (type === TYPE_INT) {
    parsed = readIntValue(buf, offset);
  } else if (type === TYPE_STRING) {
    parsed = readStringValue(buf, offset);
  } else if (type === TYPE_LIST) {
    parsed = readListValue(buf, offset);
  } else if (type === TYPE_OBJECT) {
    parsed = readObjectValue(buf, offset);
  } else {
    throw new Error('Unknown type: ' + type);
  }

  return { name, value: parsed.value, offset: parsed.offset };
}

function decodeMessage(buf) {
  if (!Buffer.isBuffer(buf)) {
    buf = Buffer.from(buf);
  }
  if (buf.length < 4) {
    throw new Error('Buffer too short');
  }

  const version = buf.readUInt8(0);
  if (version !== VERSION) {
    throw new Error('Unsupported version: ' + version);
  }

  const fieldCount = buf.readUInt8(1);
  const totalLength = buf.readUInt16BE(2);

  if (totalLength !== buf.length) {
    // Можно сделать мягче (>=), но по спецификации должно совпадать.
    throw new Error(`Length mismatch: header=${totalLength}, actual=${buf.length}`);
  }

  let offset = 4;
  const result = {};
  for (let i = 0; i < fieldCount; i++) {
    const res = readField(buf, offset);
    result[res.name] = res.value;
    offset = res.offset;
  }

  return result;
}

module.exports = {
  encodeMessage,
  decodeMessage,
};
