// Downloads for ImmersivePoints, with an optional versioned cache.
//
// Without a version, a file is downloaded as usual (the browser's normal HTTP caching applies).
// With a version, the bytes are kept in the browser's Cache Storage under (url, version):
//   - the next load with the same url and version reads them from there, with no network request;
//   - a load with a different version downloads the file again, bypassing the browser's HTTP
//     cache, stores it, and deletes the copies of every other version of that url.
// So a data owner who updates a file only has to change its version to make every viewer
// download it again. The cache lives in each viewer's own browser and is never shared.
//
// Cache Storage needs a secure context (https or localhost). Where it is missing or full,
// downloads still work; they are just not cached.

const CACHE_NAME = 'immersivepoints-files';
const KEY_ROOT = '/__immersivepoints-cache__/';

// A version is any non-empty string or number; anything else means "do not cache".
export function normalizeVersion(version) {
    if (version === undefined || version === null) return null;
    if (typeof version !== 'string' && typeof version !== 'number') return null;
    const text = String(version).trim();
    return text === '' ? null : text;
}

function cacheAvailable() {
    try {
        return typeof caches !== 'undefined' && self.isSecureContext !== false;
    } catch (e) {
        return false;
    }
}

// Cache keys are same-origin URLs that are never requested: one folder per file URL, one
// entry per version, so all versions of a file share a prefix.
function keyPrefix(url) {
    return new URL(KEY_ROOT + encodeURIComponent(url) + '/', self.location.origin).href;
}

export function cacheKey(url, version) {
    return keyPrefix(url) + encodeURIComponent(version);
}

async function readCached(url, version) {
    if (!cacheAvailable()) return null;
    try {
        const cache = await caches.open(CACHE_NAME);
        const hit = await cache.match(cacheKey(url, version));
        return hit ? await hit.arrayBuffer() : null;
    } catch (e) {
        console.warn('Could not read the point cloud cache:', e);
        return null;
    }
}

async function storeCached(url, version, buffer) {
    if (!cacheAvailable()) return false;
    try {
        const cache = await caches.open(CACHE_NAME);
        const key = cacheKey(url, version);
        await cache.put(key, new Response(buffer, { headers: { 'Content-Type': 'application/octet-stream' } }));
        const prefix = keyPrefix(url);
        const requests = await cache.keys();
        await Promise.all(requests
            .filter((request) => request.url.startsWith(prefix) && request.url !== key)
            .map((request) => cache.delete(request)));
        return true;
    } catch (e) {
        console.warn('Could not cache ' + url + ' (version ' + version + '):', e);
        return false;
    }
}

// Lists the cached versions of a url (mainly for testing and debugging).
export async function cachedVersions(url) {
    if (!cacheAvailable()) return [];
    const cache = await caches.open(CACHE_NAME);
    const prefix = keyPrefix(url);
    return (await cache.keys())
        .filter((request) => request.url.startsWith(prefix))
        .map((request) => decodeURIComponent(request.url.slice(prefix.length)));
}

// Removes every cached file.
export async function clearCache() {
    if (cacheAvailable()) await caches.delete(CACHE_NAME);
}

function downloadError(kind, url, status, statusText) {
    const messages = {
        network: 'Could not download ' + url + ' (network error, or the server does not allow CORS)',
        timeout: 'The download of ' + url + ' stalled for too long',
        http: 'HTTP ' + status + (statusText ? ' ' + statusText : '') + ' for ' + url,
    };
    const error = new Error(messages[kind]);
    error.kind = kind;
    error.status = status || 0;
    error.statusText = statusText || '';
    error.url = url;
    return error;
}

// fetch() with progress reporting and a stall timeout (no bytes for `stallTimeout` ms).
async function fetchBytes(url, options) {
    const controller = new AbortController();
    let timer = null;
    const arm = () => {
        clearTimeout(timer);
        timer = setTimeout(() => controller.abort(), options.stallTimeout);
    };
    arm();
    let response;
    try {
        response = await fetch(url, { signal: controller.signal, cache: options.reload ? 'reload' : 'default' });
    } catch (e) {
        clearTimeout(timer);
        throw downloadError(controller.signal.aborted ? 'timeout' : 'network', url);
    }
    if (!response.ok) {
        clearTimeout(timer);
        throw downloadError('http', url, response.status, response.statusText);
    }
    const total = Number(response.headers.get('Content-Length')) || 0;
    if (!response.body || !response.body.getReader) {
        try {
            return await response.arrayBuffer();
        } finally {
            clearTimeout(timer);
        }
    }
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            arm();
            if (options.onProgress && total) options.onProgress(Math.min(100, (received / total) * 100));
        }
    } catch (e) {
        throw downloadError(controller.signal.aborted ? 'timeout' : 'network', url);
    } finally {
        clearTimeout(timer);
    }
    const bytes = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
    }
    return bytes.buffer;
}

// Downloads `url` as an ArrayBuffer. Resolves to { buffer, fromCache, version, stored }, where
// `stored` is a promise that settles once a versioned download is in the cache.
//
// options.version       cache under this version (see the top of this file); omit to not cache
// options.onProgress    called with 0-100 while downloading (when the size is known)
// options.stallTimeout  ms without data before giving up (default 30000)
//
// Errors carry `kind` ('network', 'timeout' or 'http'), `status` and `url`.
export async function download(url, options = {}) {
    const version = normalizeVersion(options.version);
    if (version) {
        const cached = await readCached(url, version);
        if (cached) {
            return { buffer: cached, fromCache: true, version, stored: Promise.resolve(true) };
        }
    }
    const buffer = await fetchBytes(url, {
        onProgress: options.onProgress,
        stallTimeout: options.stallTimeout || 30000,
        reload: Boolean(version),
    });
    const stored = version ? storeCached(url, version, buffer) : Promise.resolve(false);
    return { buffer, fromCache: false, version, stored };
}
