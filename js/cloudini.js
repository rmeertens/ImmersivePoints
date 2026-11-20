// Cloudini (.cldn) support for ImmersivePoints.
//
// Cloudini (https://github.com/facontidavide/cloudini) is a point cloud compression
// format by Davide Faconti. This module wraps the official WebAssembly build of the
// Cloudini library (vendored in ./vendor/cloudini, release 1.5.0, Apache-2.0), so
// encoding and decoding are bit-for-bit the same as the C++ and Python tooling.
//
// Byte order: ImmersivePoints' own .xyz/.xyzi/.xyzrgb files are BIG-endian float32
// (numpy `.byteswap().tofile()`), whereas Cloudini stores a little-endian
// sensor_msgs/PointCloud2 style buffer. The helpers below convert between the two.
//
// Field layout written by encodeCloudini():
//   XYZ    -> x, y, z (FLOAT32)                         point_step 12
//   XYZI   -> x, y, z, hue (FLOAT32, hue in 0..1)       point_step 16
//   XYZRGB -> x, y, z (FLOAT32), rgb (UINT32, packed 0x00RRGGBB, PCL/ROS style)
//                                                       point_step 16
// The decoder understands those plus common ROS layouts (rgb/rgba packed,
// separate r/g/b fields, intensity), so clouds compressed from rosbags also render.

const SCRIPT_URL = new URL('./vendor/cloudini/cloudini_wasm_single.js', import.meta.url).href;
const MAGIC = 'CLOUDINI_V';

export const CLOUDINI_EXTENSION = '.cldn';

const FIELD_SIZES = {
    INT8: 1, UINT8: 1, INT16: 2, UINT16: 2, INT32: 4, UINT32: 4,
    FLOAT32: 4, FLOAT64: 8, INT64: 8, UINT64: 8,
};

let modulePromise = null;

// Lazily loads the (≈1 MB) WASM module the first time it's needed.
export function loadCloudini() {
    if (modulePromise) return modulePromise;
    modulePromise = new Promise((resolve, reject) => {
        const start = () => {
            globalThis.CloudiniModule().then(resolve, reject);
        };
        if (typeof globalThis.CloudiniModule === 'function') {
            start();
            return;
        }
        const script = document.createElement('script');
        script.src = SCRIPT_URL;
        script.async = true;
        script.onload = () => {
            if (typeof globalThis.CloudiniModule !== 'function') {
                reject(new Error('Cloudini WASM script loaded but CloudiniModule is missing'));
                return;
            }
            start();
        };
        script.onerror = () => reject(new Error('Could not load the Cloudini decoder (' + SCRIPT_URL + ')'));
        document.head.appendChild(script);
    }).catch((err) => {
        modulePromise = null; // allow a retry
        throw err;
    });
    return modulePromise;
}

function toUint8(buffer) {
    if (buffer instanceof Uint8Array) return buffer;
    if (ArrayBuffer.isView(buffer)) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    return new Uint8Array(buffer);
}

// True when the buffer starts with the "CLOUDINI_V" magic.
export function isCloudini(buffer) {
    const bytes = toUint8(buffer);
    if (bytes.length < MAGIC.length + 2) return false;
    for (let i = 0; i < MAGIC.length; i++) {
        if (bytes[i] !== MAGIC.charCodeAt(i)) return false;
    }
    return true;
}

// Parses the YAML produced by Cloudini's EncodingInfoToYAML (a fixed, simple layout).
export function parseHeaderYAML(text) {
    const info = { fields: [] };
    let field = null;
    for (const rawLine of text.split('\n')) {
        const line = rawLine.replace(/\s+$/, '');
        if (!line.trim()) continue;
        const m = line.match(/^(\s*)(-\s+)?([A-Za-z_]+):\s*(.*)$/);
        if (!m) continue;
        const [, indent, dash, key, value] = m;
        if (indent.length === 0 && !dash) {
            if (key === 'fields') continue;
            info[key] = /^-?\d+$/.test(value) ? parseInt(value, 10) : value;
            continue;
        }
        if (dash) {
            field = {};
            info.fields.push(field);
        }
        if (!field) continue;
        if (key === 'offset') field.offset = parseInt(value, 10);
        else if (key === 'resolution') field.resolution = value === 'null' ? null : parseFloat(value);
        else field[key] = value;
    }
    return info;
}

function writeBytes(mod, bytes) {
    const ptr = mod._malloc(Math.max(bytes.length, 1));
    if (!ptr) throw new Error('Out of WebAssembly memory (' + bytes.length + ' bytes requested)');
    mod.HEAPU8.set(bytes, ptr);
    return ptr;
}

function allocate(mod, size) {
    const ptr = mod._malloc(Math.max(size, 1));
    if (!ptr) throw new Error('Out of WebAssembly memory (' + size + ' bytes requested); the point cloud is too large to process in the browser');
    return ptr;
}

// Reads just the header of a Cloudini buffer (works for YAML and binary headers).
export async function readCloudiniHeader(buffer) {
    const mod = await loadCloudini();
    const bytes = toUint8(buffer);
    if (!isCloudini(bytes)) throw new Error('Not a Cloudini file (missing CLOUDINI_V magic)');
    const inPtr = writeBytes(mod, bytes);
    const yamlCapacity = 1 << 16;
    const yamlPtr = allocate(mod, yamlCapacity);
    try {
        const len = mod._cldn_GetHeaderAsYAML(inPtr, bytes.length, yamlPtr);
        if (!len) throw new Error('Could not parse the Cloudini header');
        const text = new TextDecoder().decode(mod.HEAPU8.slice(yamlPtr, yamlPtr + len));
        return parseHeaderYAML(text);
    } finally {
        mod._free(inPtr);
        mod._free(yamlPtr);
    }
}

// Decodes a Cloudini buffer. Returns { info, data } where data holds width*height
// points of point_step bytes each (little-endian, PointCloud2 layout).
export async function decodeCloudini(buffer) {
    const mod = await loadCloudini();
    const bytes = toUint8(buffer);
    const info = await readCloudiniHeader(bytes);
    const outSize = info.width * info.height * info.point_step;
    if (!outSize) throw new Error('Cloudini file contains no points');
    const inPtr = writeBytes(mod, bytes);
    let outPtr = 0;
    try {
        outPtr = allocate(mod, outSize);
        const written = mod._cldn_DecodeCompressedData(inPtr, bytes.length, outPtr);
        if (written !== outSize) {
            throw new Error('Cloudini decoding failed (see the browser console for details)');
        }
        // HEAPU8 may have been replaced by memory growth; read it after the call.
        const data = mod.HEAPU8.slice(outPtr, outPtr + outSize);
        return { info, data };
    } finally {
        mod._free(inPtr);
        if (outPtr) mod._free(outPtr);
    }
}

function fieldReader(view, field) {
    const o = field.offset;
    switch (field.type) {
        case 'INT8': return (base) => view.getInt8(base + o);
        case 'UINT8': return (base) => view.getUint8(base + o);
        case 'INT16': return (base) => view.getInt16(base + o, true);
        case 'UINT16': return (base) => view.getUint16(base + o, true);
        case 'INT32': return (base) => view.getInt32(base + o, true);
        case 'UINT32': return (base) => view.getUint32(base + o, true);
        case 'FLOAT32': return (base) => view.getFloat32(base + o, true);
        case 'FLOAT64': return (base) => view.getFloat64(base + o, true);
        case 'INT64': return (base) => Number(view.getBigInt64(base + o, true));
        case 'UINT64': return (base) => Number(view.getBigUint64(base + o, true));
        default: return null;
    }
}

function findField(info, ...names) {
    for (const name of names) {
        const f = info.fields.find((fl) => fl.name.toLowerCase() === name);
        if (f && FIELD_SIZES[f.type] && f.offset + FIELD_SIZES[f.type] <= info.point_step) return f;
    }
    return null;
}

// HSL -> RGB with saturation 1 and lightness 0.5 (matches THREE.Color.setHSL(h, 1, 0.5)).
function hueToRGB(h, out, i) {
    h = ((h % 1) + 1) % 1;
    const k = (n) => (n + h * 12) % 12;
    const f = (n) => 0.5 - 0.5 * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    out[i] = f(0);
    out[i + 1] = f(8);
    out[i + 2] = f(4);
}

// Robust range (1st..99th percentile) of a scalar, sampled for speed.
function robustRange(values, count) {
    const step = Math.max(1, Math.floor(count / 20000));
    const sample = [];
    for (let i = 0; i < count; i += step) {
        if (Number.isFinite(values[i])) sample.push(values[i]);
    }
    if (!sample.length) return [0, 1];
    sample.sort((a, b) => a - b);
    const lo = sample[Math.floor(sample.length * 0.01)];
    const hi = sample[Math.min(sample.length - 1, Math.floor(sample.length * 0.99))];
    return hi > lo ? [lo, hi] : [sample[0], sample[sample.length - 1] > sample[0] ? sample[sample.length - 1] : sample[0] + 1];
}

// Converts a decoded cloud into ImmersivePoints arrays.
// Returns { count, positions: Float32Array(3n), colors: Float32Array(3n), hues: Float32Array|null, colorSource }.
// Points with a non-finite x, y or z (e.g. lidar no-returns) are dropped.
export function cloudToPoints(info, data) {
    const fx = findField(info, 'x');
    const fy = findField(info, 'y');
    const fz = findField(info, 'z');
    if (!fx || !fy || !fz) {
        throw new Error('Cloudini cloud has no x/y/z fields (fields: ' + info.fields.map((f) => f.name).join(', ') + ')');
    }
    const bytes = toUint8(data);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const total = Math.min(info.width * info.height, Math.floor(bytes.length / info.point_step));
    const step = info.point_step;
    const rx = fieldReader(view, fx), ry = fieldReader(view, fy), rz = fieldReader(view, fz);

    const positions = new Float32Array(total * 3);
    const keep = new Uint32Array(total);
    let count = 0;
    for (let p = 0; p < total; p++) {
        const base = p * step;
        const x = rx(base), y = ry(base), z = rz(base);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
        positions[count * 3] = x;
        positions[count * 3 + 1] = y;
        positions[count * 3 + 2] = z;
        keep[count++] = base;
    }

    const colors = new Float32Array(count * 3);
    let hues = null;
    let colorSource;

    const fHue = findField(info, 'hue');
    const fPacked = findField(info, 'rgb', 'rgba');
    const fR = findField(info, 'r', 'red'), fG = findField(info, 'g', 'green'), fB = findField(info, 'b', 'blue');
    const fScalar = findField(info, 'intensity', 'reflectivity', 'i');

    if (fHue) {
        colorSource = 'hue';
        const rh = fieldReader(view, fHue);
        hues = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            hues[i] = rh(keep[i]);
            hueToRGB(hues[i], colors, i * 3);
        }
    } else if (fPacked && FIELD_SIZES[fPacked.type] === 4) {
        // Packed 0x(AA)RRGGBB, stored as uint32 or (PCL style) as the bits of a float32.
        colorSource = 'rgb';
        const o = fPacked.offset;
        for (let i = 0; i < count; i++) {
            const v = view.getUint32(keep[i] + o, true);
            colors[i * 3] = ((v >>> 16) & 0xff) / 255;
            colors[i * 3 + 1] = ((v >>> 8) & 0xff) / 255;
            colors[i * 3 + 2] = (v & 0xff) / 255;
        }
    } else if (fR && fG && fB) {
        colorSource = 'r,g,b';
        const readers = [fieldReader(view, fR), fieldReader(view, fG), fieldReader(view, fB)];
        const isFloat = fR.type.startsWith('FLOAT');
        let scale = 1 / 255;
        if (isFloat) {
            let max = 0;
            for (let i = 0; i < count; i++) max = Math.max(max, readers[0](keep[i]), readers[1](keep[i]), readers[2](keep[i]));
            scale = max > 1 ? 1 / 255 : 1;
        } else if (FIELD_SIZES[fR.type] === 2) {
            scale = 1 / 65535;
        }
        for (let i = 0; i < count; i++) {
            for (let c = 0; c < 3; c++) colors[i * 3 + c] = Math.min(1, Math.max(0, readers[c](keep[i]) * scale));
        }
    } else {
        // Scalar coloring: intensity if present, otherwise height (viewer Y axis is up).
        let values = new Float32Array(count);
        if (fScalar) {
            colorSource = fScalar.name;
            const rs = fieldReader(view, fScalar);
            for (let i = 0; i < count; i++) values[i] = rs(keep[i]);
        } else {
            colorSource = 'height';
            for (let i = 0; i < count; i++) values[i] = positions[i * 3 + 1];
        }
        const [lo, hi] = robustRange(values, count);
        const span = hi - lo || 1;
        for (let i = 0; i < count; i++) {
            const t = Math.min(1, Math.max(0, (values[i] - lo) / span));
            hueToRGB(0.7 * (1 - t), colors, i * 3); // blue (low) -> red (high)
        }
        values = null;
    }

    return {
        count,
        positions: count === total ? positions : positions.slice(0, count * 3),
        colors,
        hues,
        colorSource,
    };
}

// Reads an ImmersivePoints raw file (big-endian float32) into a native Float32Array.
export function readImmersiveFloats(buffer) {
    const bytes = toUint8(buffer);
    if (bytes.length % 4 !== 0) throw new Error('File size (' + bytes.length + ' bytes) is not a multiple of 4: not a float32 file');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const out = new Float32Array(bytes.length / 4);
    for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, false);
    return out;
}

function writeImmersiveFloats(values) {
    const buf = new ArrayBuffer(values.length * 4);
    const view = new DataView(buf);
    for (let i = 0; i < values.length; i++) view.setFloat32(i * 4, values[i], false);
    return new Uint8Array(buf);
}

export const POINT_TYPES = { XYZ: 3, XYZI: 4, XYZRGB: 6 };

function formatResolution(r) {
    // Shortest representation that round-trips through float32, like Cloudini's own writer.
    for (let digits = 6; digits <= 9; digits++) {
        const s = r.toPrecision(digits);
        if (Math.fround(parseFloat(s)) === Math.fround(r)) return String(parseFloat(s));
    }
    return String(r);
}

// Builds the Cloudini YAML header and little-endian point buffer for ImmersivePoints data.
// `floats` is a native Float32Array with 3, 4 or 6 values per point (see POINT_TYPES).
export function buildCloudiniInput(floats, pointType, options = {}) {
    const perPoint = POINT_TYPES[pointType];
    if (!perPoint) throw new Error('Unknown point type ' + pointType + ' (expected XYZ, XYZI or XYZRGB)');
    if (floats.length === 0 || floats.length % perPoint !== 0) {
        throw new Error(floats.length + ' floats cannot be split into ' + pointType + ' points (' + perPoint + ' floats per point)');
    }
    const resolution = options.resolution === undefined ? 0.001 : options.resolution;
    const lossy = resolution !== null && resolution > 0;
    const compression = options.compression || 'ZSTD';
    if (!['NONE', 'LZ4', 'ZSTD'].includes(compression)) throw new Error('Unknown compression ' + compression);

    const n = floats.length / perPoint;
    const pointStep = pointType === 'XYZ' ? 12 : 16;
    const fields = [
        { name: 'x', offset: 0, type: 'FLOAT32', resolution: lossy ? resolution : null },
        { name: 'y', offset: 4, type: 'FLOAT32', resolution: lossy ? resolution : null },
        { name: 'z', offset: 8, type: 'FLOAT32', resolution: lossy ? resolution : null },
    ];
    if (pointType === 'XYZI') fields.push({ name: 'hue', offset: 12, type: 'FLOAT32', resolution: lossy ? 0.0001 : null });
    if (pointType === 'XYZRGB') fields.push({ name: 'rgb', offset: 12, type: 'UINT32', resolution: null });

    const data = new Uint8Array(n * pointStep);
    const view = new DataView(data.buffer);
    const to8 = (v) => Math.round(Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0)) * 255);
    for (let p = 0; p < n; p++) {
        const src = p * perPoint, dst = p * pointStep;
        view.setFloat32(dst, floats[src], true);
        view.setFloat32(dst + 4, floats[src + 1], true);
        view.setFloat32(dst + 8, floats[src + 2], true);
        if (pointType === 'XYZI') {
            view.setFloat32(dst + 12, floats[src + 3], true);
        } else if (pointType === 'XYZRGB') {
            const rgb = (to8(floats[src + 3]) << 16) | (to8(floats[src + 4]) << 8) | to8(floats[src + 5]);
            view.setUint32(dst + 12, rgb >>> 0, true);
        }
    }

    const lines = [
        'version: 6',
        'width: ' + n,
        'height: 1',
        'point_step: ' + pointStep,
        'encoding_opt: ' + (lossy ? 'LOSSY' : 'LOSSLESS'),
        'compression_opt: ' + compression,
        'fields:',
    ];
    for (const f of fields) {
        lines.push('  - name: ' + f.name);
        lines.push('    offset: ' + f.offset);
        lines.push('    type: ' + f.type);
        lines.push('    resolution: ' + (f.resolution === null ? 'null' : formatResolution(f.resolution)));
    }
    return { yaml: lines.join('\n') + '\n', data, pointCount: n };
}

// Encodes ImmersivePoints data (native Float32Array, 3/4/6 floats per point) as a Cloudini buffer.
// options.resolution: max quantization step for x/y/z in scene units (default 0.001); null = lossless.
// options.compression: 'ZSTD' (default), 'LZ4' or 'NONE'.
export async function encodeCloudini(floats, pointType, options = {}) {
    const { yaml, data } = buildCloudiniInput(floats, pointType, options);
    return encodeRawCloud(yaml, data);
}

// Encodes an arbitrary little-endian PointCloud2-style buffer described by a Cloudini YAML header.
export async function encodeRawCloud(yaml, data) {
    const mod = await loadCloudini();
    const yamlBytes = new TextEncoder().encode(yaml + '\0');
    const yamlPtr = writeBytes(mod, yamlBytes);
    let dataPtr = 0, outPtr = 0;
    try {
        dataPtr = writeBytes(mod, data);
        // The library refuses outputs larger than the input, so this capacity is enough.
        outPtr = allocate(mod, data.length);
        const written = mod._cldn_EncodePointcloudData(yamlPtr, dataPtr, data.length, outPtr);
        if (!written) {
            throw new Error('Cloudini encoding failed. Very small clouds (a few dozen points) cannot be ' +
                'compressed because the header is larger than the data; see the browser console for details.');
        }
        return mod.HEAPU8.slice(outPtr, outPtr + written);
    } finally {
        mod._free(yamlPtr);
        if (dataPtr) mod._free(dataPtr);
        if (outPtr) mod._free(outPtr);
    }
}

// Decodes a Cloudini buffer into an ImmersivePoints raw file (big-endian float32).
// Clouds written by encodeCloudini() come back in their original type (XYZ, XYZI or
// XYZRGB); other clouds come back as XYZRGB, colored as the viewer would color them.
export async function cloudiniToImmersive(buffer) {
    const { info, data } = await decodeCloudini(buffer);
    const pts = cloudToPoints(info, data);
    let pointType;
    let perPoint;
    const hasColorField = pts.colorSource === 'hue' || pts.colorSource === 'rgb' || pts.colorSource === 'r,g,b';
    if (pts.hues) {
        pointType = 'XYZI';
        perPoint = 4;
    } else if (!hasColorField && info.fields.length === 3) {
        pointType = 'XYZ';
        perPoint = 3;
    } else {
        pointType = 'XYZRGB';
        perPoint = 6;
    }
    const out = new Float32Array(pts.count * perPoint);
    for (let i = 0; i < pts.count; i++) {
        const o = i * perPoint;
        out[o] = pts.positions[i * 3];
        out[o + 1] = pts.positions[i * 3 + 1];
        out[o + 2] = pts.positions[i * 3 + 2];
        if (pointType === 'XYZI') out[o + 3] = pts.hues[i];
        else if (pointType === 'XYZRGB') {
            out[o + 3] = pts.colors[i * 3];
            out[o + 4] = pts.colors[i * 3 + 1];
            out[o + 5] = pts.colors[i * 3 + 2];
        }
    }
    return { info, pointType, pointCount: pts.count, colorSource: pts.colorSource, bytes: writeImmersiveFloats(out) };
}
