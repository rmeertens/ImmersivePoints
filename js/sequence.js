// Sequence playback for ImmersivePoints: a scene whose points, boxes and lines change over time,
// such as a lidar recording with one point cloud per sweep.
//
// A sequence is part of the scene config (jsonb64=, config= or the url= shorthand):
//
//   "sequence": {                                   numbered files, expanded with a template
//       "points": { "url": "https://host/scan_{i:04}.xyzi", "type": "XYZI" },
//       "bboxes": { "url": "https://host/boxes_{i:04}.bbox" },
//       "lines":  { "url": "https://host/lines_{i:04}.lines" },
//       "start": 0, "count": 200                    or "end": 199 (inclusive); optional "step"
//   },
//   "frames": [ { "points": [...], "bboxes": [...], "lines": [...], "label": "t=0.1s" }, ... ],
//                                                   "label" is optional and shown next to the frame number
//   "fps": 10, "loop": true, "autoplay": true
//
// "frames" is an explicit list in which every frame uses the same schema as a static scene.
// Top-level "points", "bboxes", "lines" and "objects" stay visible for the whole sequence.
//
// Nothing in this module depends on three.js: the viewer passes in a loadFrame function that
// returns any object with a `visible` flag, which keeps the playback logic testable on its own.

import { hueToRGB, robustRange } from './cloudini.js';

export const POINTS_PER_ROW = { XYZ: 3, XYZI: 4, XYZRGB: 6 };

const MAX_FRAMES = 100000;
const PLACEHOLDER = /\{i(?::(\d+)d?)?\}/g; // {i}, {i:4}, {i:04} or {i:04d}

// Braces can arrive percent-encoded when the template was part of a URL.
function decodeBraces(template) {
    return String(template).replace(/%7B/gi, '{').replace(/%7D/gi, '}');
}

export function isFrameTemplate(url) {
    return typeof url === 'string' && /\{i(?::\d+d?)?\}/.test(decodeBraces(url));
}

// Fills {i} or a zero-padded {i:04} with the frame number.
export function fillTemplate(template, index) {
    return decodeBraces(template).replace(PLACEHOLDER, function (_, width) {
        var text = String(Math.abs(index));
        if (width) {
            while (text.length < parseInt(width, 10)) text = '0' + text;
        }
        return (index < 0 ? '-' : '') + text;
    });
}

// Parses the frames= URL parameter: "0-199" (inclusive range) or "200" (count from 0).
export function parseFrameRange(text) {
    var value = String(text).trim();
    var range = /^(-?\d+)\s*(?:-|\.\.)\s*(-?\d+)$/.exec(value);
    if (range) {
        return { start: parseInt(range[1], 10), end: parseInt(range[2], 10) };
    }
    if (/^\d+$/.test(value)) {
        return { start: 0, count: parseInt(value, 10) };
    }
    throw new Error('frames= must be a range like 0-199 or a count like 200, not "' + text + '"');
}

function integer(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    var n = Number(value);
    if (!Number.isInteger(n)) throw new Error('Expected a whole number, got ' + JSON.stringify(value));
    return n;
}

// Turns a scene config into a list of frame specs, each shaped like a static scene.
export function expandFrames(config) {
    if (Array.isArray(config.frames)) {
        if (config.frames.length > MAX_FRAMES) throw new Error('A sequence can have at most ' + MAX_FRAMES + ' frames');
        return config.frames.slice();
    }
    var seq = config.sequence;
    if (!seq) return [];

    var start = integer(seq.start, 0);
    var step = integer(seq.step, 1);
    if (step === 0) throw new Error('"step" cannot be 0');
    var count;
    if (seq.count !== undefined) {
        count = integer(seq.count);
    } else if (seq.end !== undefined) {
        count = Math.floor((integer(seq.end) - start) / step) + 1;
    } else {
        throw new Error('A sequence needs "count" or "end" to know how many frames there are');
    }
    if (!(count > 0)) throw new Error('The sequence has no frames (count ' + count + ')');
    if (count > MAX_FRAMES) throw new Error('A sequence can have at most ' + MAX_FRAMES + ' frames');

    var kinds = ['points', 'bboxes', 'lines'].filter(function (kind) { return seq[kind]; });
    if (!kinds.length) throw new Error('A sequence needs a "points", "bboxes" or "lines" entry with a url template');
    kinds.forEach(function (kind) {
        if (!seq[kind].url) throw new Error('sequence.' + kind + ' needs a "url"');
    });

    var frames = [];
    for (var k = 0; k < count; k++) {
        var index = start + k * step;
        var frame = {};
        kinds.forEach(function (kind) {
            frame[kind] = [Object.assign({}, seq[kind], { source: 'url', url: fillTemplate(seq[kind].url, index) })];
        });
        frames.push(frame);
    }
    return frames;
}

// Converts ImmersivePoints floats (XYZ, XYZI or XYZRGB rows) to position and color arrays.
// XYZ points are colored by height, blue (low) to red (high). upIndex is the up axis:
// 2 for Z up (the default), 1 for Y up.
export function floatsToPointArrays(floats, pointType, upIndex) {
    var up = upIndex === undefined ? 2 : upIndex;
    var type = String(pointType || '').toUpperCase();
    var ppr = POINTS_PER_ROW[type];
    if (!ppr) throw new Error('Unknown point type "' + pointType + '": expected XYZ, XYZI, XYZRGB or CLOUDINI');
    if (floats.length === 0) throw new Error('The point cloud is empty');
    if (floats.length % ppr !== 0) {
        throw new Error((floats.length * 4) + ' bytes cannot be divided into ' + type + ' points (' + ppr + ' float32 values each)');
    }
    var count = floats.length / ppr;
    var positions = new Float32Array(count * 3);
    var colors = new Float32Array(count * 3);
    for (var i = 0; i < count; i++) {
        var row = i * ppr;
        positions[i * 3] = floats[row];
        positions[i * 3 + 1] = floats[row + 1];
        positions[i * 3 + 2] = floats[row + 2];
        if (type === 'XYZI') {
            hueToRGB(floats[row + 3], colors, i * 3);
        } else if (type === 'XYZRGB') {
            colors[i * 3] = floats[row + 3];
            colors[i * 3 + 1] = floats[row + 4];
            colors[i * 3 + 2] = floats[row + 5];
        }
    }
    if (type === 'XYZ') {
        var heights = new Float32Array(count);
        for (var j = 0; j < count; j++) heights[j] = positions[j * 3 + up];
        var range = robustRange(heights, count);
        var span = range[1] - range[0] || 1;
        for (var p = 0; p < count; p++) {
            var t = Math.min(1, Math.max(0, (heights[p] - range[0]) / span));
            hueToRGB(0.7 * (1 - t), colors, p * 3);
        }
    }
    return { count: count, positions: positions, colors: colors };
}

// Loads frames in the background and steps through them over time.
//
// options.frames      frame specs from expandFrames
// options.loadFrame   (spec, index) => Promise of an object with a `visible` flag
// options.parent      gets parent.add(object) for every loaded frame
// options.onChange    called after anything visible changes (frame, play state, loading)
//
// Frames load a few at a time, nearest to the current frame first. Playback waits on a frame
// that has not loaded yet, and skips frames that failed to load.
export class SequencePlayer {
    constructor(options) {
        this.frames = options.frames;
        this.loadFrame = options.loadFrame;
        this.parent = options.parent;
        this.onChange = options.onChange || function () {};
        this.fps = options.fps > 0 ? options.fps : 10;
        this.loop = options.loop !== false;
        this.playing = options.autoplay !== false;
        this.concurrency = options.concurrency || 4;

        var n = this.frames.length;
        this.objects = new Array(n).fill(null);
        this.status = new Array(n).fill('pending');
        this.errors = new Array(n).fill(null);
        this.loadedCount = 0;
        this.failedCount = 0;
        this.current = 0;
        this.elapsed = 0;
        this.buffering = false;
        this.stopped = false;
    }

    get length() {
        return this.frames.length;
    }

    // Starts loading. Resolves once the first frame is shown, rejects if it fails to load.
    start() {
        var self = this;
        return new Promise(function (resolve, reject) {
            self._first = { resolve: resolve, reject: reject };
            for (var w = 0; w < self.concurrency; w++) self._loadNext();
        });
    }

    stop() {
        this.stopped = true;
        this.playing = false;
    }

    _nextPending() {
        var n = this.length;
        for (var k = 0; k < n; k++) {
            var i = (this.current + k) % n;
            if (this.status[i] === 'pending') return i;
        }
        return -1;
    }

    _loadNext() {
        if (this.stopped) return;
        var i = this._nextPending();
        if (i < 0) return;
        var self = this;
        this.status[i] = 'loading';
        Promise.resolve()
            .then(function () { return self.loadFrame(self.frames[i], i); })
            .then(function (object) {
                if (self.stopped) return;
                object.visible = (i === self.current);
                self.objects[i] = object;
                self.status[i] = 'ready';
                self.loadedCount++;
                if (self.parent) self.parent.add(object);
            }, function (error) {
                self.status[i] = 'failed';
                self.errors[i] = error;
                self.failedCount++;
                console.warn('Sequence frame ' + (i + 1) + ' failed to load:', error);
            })
            .then(function () {
                if (self._first && self.status[0] !== 'loading' && self.status[0] !== 'pending') {
                    var first = self._first;
                    self._first = null;
                    if (self.status[0] === 'ready') {
                        first.resolve();
                    } else {
                        self.stop();
                        first.reject(self.errors[0] || new Error('The first frame failed to load'));
                    }
                }
                self.onChange(self);
                self._loadNext();
            });
    }

    isAvailable(i) {
        return this.status[i] === 'ready' || this.status[i] === 'failed';
    }

    // Advances playback by dt seconds. Call it once per rendered frame.
    update(dt) {
        if (!this.playing || this.stopped) return;
        var frameDuration = 1 / this.fps;
        // Cap the backlog so a hidden tab does not fast-forward through many frames at once.
        this.elapsed = Math.min(this.elapsed + dt, Math.max(1, frameDuration));
        var changed = false;
        var wasBuffering = this.buffering;
        this.buffering = false;
        while (this.elapsed >= frameDuration) {
            var next = this.current + 1;
            if (next >= this.length) {
                if (!this.loop) {
                    this.playing = false;
                    this.elapsed = 0;
                    changed = true;
                    break;
                }
                next = 0;
            }
            if (!this.isAvailable(next)) {
                this.buffering = true;
                this.elapsed = frameDuration;
                break;
            }
            this._show(next);
            this.elapsed -= frameDuration;
            changed = true;
        }
        if (changed || wasBuffering !== this.buffering) this.onChange(this);
    }

    _show(i) {
        var previous = this.objects[this.current];
        if (previous) previous.visible = false;
        this.current = i;
        var object = this.objects[i];
        if (object) object.visible = true;
    }

    seek(i) {
        var n = this.length;
        var target = Math.max(0, Math.min(n - 1, Math.round(i)));
        this._show(target);
        this.elapsed = 0;
        this.buffering = false;
        this.onChange(this);
    }

    // Steps forward (1) or back (-1), wrapping around, and pauses.
    step(delta) {
        this.playing = false;
        var n = this.length;
        this.seek(((this.current + delta) % n + n) % n);
    }

    togglePlay() {
        if (!this.playing && !this.loop && this.current === this.length - 1) {
            this._show(0);
        }
        this.playing = !this.playing;
        this.elapsed = 0;
        this.onChange(this);
    }

    // The frame's own "label" (e.g. a timestamp) if the config gave one, otherwise null.
    label(i) {
        var frame = this.frames[i === undefined ? this.current : i];
        return frame && frame.label !== undefined && frame.label !== null ? String(frame.label) : null;
    }
}
