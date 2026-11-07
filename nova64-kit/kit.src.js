/*
 * Nova64 cart kit for m{ai}geXR. One source, shared by Web/Electron, iOS and Android.
 *
 * Generated copies live in src/lib/nova64-kit.generated.ts and inline in each
 * mobile playground-nova64.html. Edit nova64-kit/kit.src.js, then run
 * `node nova64-kit/build.mjs`.
 *
 * What it does, in the spirit of Nova64 Studio:
 *  - Game templates: the AI rewrites only a tested engine's CONFIG, and
 *    prepare() splices that CONFIG into the engine.
 *  - The kit owns the imports: bare API names get exact `const { ... } = nova64.<group>`
 *    lines generated from the published NAMESPACE_MAP.
 *  - Deterministic repairs for known failure modes (import/export lines, cls()
 *    in a 3D draw(), pure-black template colours, missing CONFIG consts), plus a
 *    list of problems that could not be fixed automatically.
 */
(function (root) {
  'use strict';

  var DATA = /*@NOVA64_KIT_DATA@*/ null;

  var CONFIG_MARK = '// ============================== CONFIG ==============================';
  var ENGINE_MARK = '// ============================== ENGINE ==============================';
  var TEMPLATE_RE = /\/\/\s*NOVA64 TEMPLATE:\s*([a-z0-9-]+)/;

  // Template picking. Each template's CONFIG lists the chat words that pick it
  // (KEYWORDS: game words pick the kind of game, style words pick the look).
  // Mirrored exactly in Swift (Nova64Templates.swift) and Kotlin
  // (Nova64Templates.kt); the generated test vectors keep them in step.
  var OPT_OUT_RE = /\b(from scratch|free-?form|without (a |the )?template|no template|custom engine)\b/;
  var NEW_THING_RE = /\b(new|another|different)\b.*\b(scene|game|cart|demo)\b/;

  function templates() { return DATA ? DATA.templates : []; }
  function getTemplate(id) {
    var list = templates();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function templateIdOf(code) {
    var m = TEMPLATE_RE.exec(code || '');
    return m && getTemplate(m[1]) ? m[1] : null;
  }

  /** True when `word` starts a word in the lower-cased message ("dodge" matches "dodges"). */
  function hasWord(message, word) {
    var i = message.indexOf(word);
    while (i >= 0) {
      if (i === 0 || !/[a-z0-9]/.test(message[i - 1])) return true;
      i = message.indexOf(word, i + 1);
    }
    return false;
  }
  function matches(message, words) {
    return (words || []).filter(function (w) { return hasWord(message, w); });
  }

  /**
   * Which template a chat request should use, and why:
   * { id, words } where words are the keywords that matched, or { id: null }.
   */
  function pickTemplate(message, currentCode) {
    var m = String(message || '').toLowerCase();
    var current = templateIdOf(currentCode);
    if (OPT_OUT_RE.test(m)) return { id: null, words: [] };
    var list = templates(), best = null, bestGame = [];
    for (var i = 0; i < list.length; i++) {
      var g = matches(m, list[i].keywords.game);
      if (g.length > bestGame.length) { best = list[i]; bestGame = g; }
    }
    if (!best) {
      if (current && !NEW_THING_RE.test(m)) return { id: current, words: [], followUp: true };
      return { id: null, words: [] };
    }
    var pick = null, pickStyle = [];
    for (var j = 0; j < list.length; j++) {
      if (list[j].family !== best.family) continue;
      var st = matches(m, list[j].keywords.style);
      if (!pick || st.length > pickStyle.length) { pick = list[j]; pickStyle = st; }
    }
    var cur = current ? getTemplate(current) : null;
    if (!pickStyle.length && cur && cur.family === best.family) pick = cur;
    return { id: pick.id, words: bestGame.concat(pickStyle) };
  }

  /** A template's chip label in chat: its first game word and first style word. */
  function chipLabel(t) {
    return t.keywords.game[0] + ' \u00b7 ' + t.keywords.style[0];
  }

  /**
   * The line that opens a template reply in chat, telling the user which template
   * their words picked and how to opt out. '' for follow-ups and free-form.
   * Platforms show it verbatim, so keep it plain markdown (bold and italics only).
   */
  function templateNote(pick) {
    var t = pick && pick.id ? getTemplate(pick.id) : null;
    if (!t || !pick.words || !pick.words.length) return '';
    return '\ud83c\udfae Started from the **' + t.genre + ' \u00b7 ' + t.style + '** template, because you said ' +
      pick.words.map(function (w) { return '*' + w + '*'; }).join(', ') +
      '. Tap a template below to preview it, or say *from scratch* to write your own.';
  }

  /** Which template a chat request should use, or null for free-form generation. */
  function chooseTemplate(message, currentCode) {
    return pickTemplate(message, currentCode).id;
  }

  /** The CONFIG section of a cart, starting at its NOVA64 TEMPLATE line. */
  function configOf(code) {
    code = String(code || '');
    var start = code.search(TEMPLATE_RE);
    if (start < 0) start = code.indexOf(CONFIG_MARK);
    if (start < 0) return null;
    var end = code.indexOf(ENGINE_MARK, start);
    return code.slice(start, end < 0 ? code.length : end).replace(/\s+$/, '') + '\n';
  }

  /** The text added to the AI request in template mode. */
  function templatePrompt(id, currentCode) {
    var t = getTemplate(id);
    if (!t) return '';
    var config = templateIdOf(currentCode) === id ? configOf(currentCode) : t.config;
    return DATA.promptTemplate
      .replace('{genre}', t.genre).replace('{style}', t.style)
      .replace('{description}', t.description).replace('{guide}', t.guide)
      .split('{id}').join(id)
      .replace('{config}', String(config).replace(/\s+$/, ''));
  }

  // ---------------------------------------------------------------- source helpers

  /** Blank out comments and string contents (keeping ${...} code and offsets). */
  function maskSource(src) {
    var out = '', i = 0, n = src.length;
    while (i < n) {
      var c = src[i], d = src[i + 1];
      if (c === '/' && d === '/') {
        while (i < n && src[i] !== '\n') { out += ' '; i++; }
      } else if (c === '/' && d === '*') {
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { out += src[i] === '\n' ? '\n' : ' '; i++; }
        if (i < n) { out += '  '; i += 2; }
      } else if (c === '"' || c === "'") {
        out += ' '; i++;
        while (i < n && src[i] !== c && src[i] !== '\n') {
          if (src[i] === '\\') { out += ' '; i++; }
          out += ' '; i++;
        }
        if (i < n) { out += ' '; i++; }
      } else if (c === '`') {
        out += ' '; i++;
        while (i < n && src[i] !== '`') {
          if (src[i] === '\\') { out += '  '; i += 2; continue; }
          if (src[i] === '$' && src[i + 1] === '{') {
            // Keep the code inside ${...}: it can call API functions.
            out += '  '; i += 2;
            var depth = 1;
            while (i < n && depth > 0) {
              if (src[i] === '{') depth++;
              else if (src[i] === '}' && --depth === 0) { out += ' '; i++; break; }
              out += src[i]; i++;
            }
            continue;
          }
          out += src[i] === '\n' ? '\n' : ' '; i++;
        }
        if (i < n) { out += ' '; i++; }
      } else { out += c; i++; }
    }
    return out;
  }

  /** [start, end) of the body of top-level `function name(...) { ... }` in masked source. */
  function functionBody(masked, name) {
    var re = new RegExp('(^|\\n)\\s*(async\\s+)?function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
    var m = re.exec(masked);
    if (!m) return null;
    var start = m.index + m[0].length, depth = 1, i = start;
    while (i < masked.length && depth > 0) {
      if (masked[i] === '{') depth++;
      else if (masked[i] === '}') depth--;
      i++;
    }
    return [start, i - 1];
  }

  /**
   * Masked source with everything nested inside braces blanked, except top-level
   * destructuring patterns (`const { a } = ...`), so only top-level names count as declared.
   */
  function topLevel(masked) {
    var out = '', depth = 0, keep = false;
    for (var i = 0; i < masked.length; i++) {
      var c = masked[i];
      if (c === '{') {
        if (depth === 0) keep = /(?:const|let|var)\s*$/.test(masked.slice(Math.max(0, i - 12), i));
        depth++; out += c; continue;
      }
      if (c === '}') { depth = Math.max(0, depth - 1); out += c; if (depth === 0) keep = false; continue; }
      out += depth === 0 || keep || c === '\n' ? c : ' ';
    }
    return out;
  }

  function apiHome() {
    var home = {}, ns = DATA ? DATA.namespace : {};
    for (var g in ns) for (var j = 0; j < ns[g].length; j++) if (!home[ns[g][j]]) home[ns[g][j]] = g;
    return home;
  }

  var DESTRUCTURE_RE = /^[ \t]*(?:const|let|var)\s*\{([^{}]*)\}\s*=\s*nova64(?:\.(\w+))?\s*;?[ \t]*\r?\n?/gm;

  /** Replace any nova64 destructuring with exact per-group imports for the bare names used. */
  function normalizeImports(code, fixes, problems) {
    var home = apiHome(), written = [];
    var body = code.replace(DESTRUCTURE_RE, function (all, names) {
      names.split(',').forEach(function (p) {
        var n = p.split(':')[0].split('=')[0].trim();
        if (n) written.push(n);
      });
      return '';
    });
    var masked = maskSource(body);
    var top = topLevel(masked);
    var declared = {};
    var declRe = /(?:^|[^\w$.])(?:function\s*\*?\s*|class\s+|(?:const|let|var)\s+)([A-Za-z_$][\w$]*)/g, m;
    while ((m = declRe.exec(top))) declared[m[1]] = true;
    var listRe = /(?:const|let|var)\s*[{[]([^}\]]*)[}\]]\s*=/g;
    while ((m = listRe.exec(top))) {
      m[1].split(',').forEach(function (p) {
        var n = p.split(':').pop().split('=')[0].replace(/\.\.\./, '').trim();
        if (n) declared[n] = true;
      });
    }
    var used = {}, idRe = /(?:^|[^\w$.])([A-Za-z_$][\w$]*)/g;
    while ((m = idRe.exec(masked))) if (home[m[1]] && !declared[m[1]]) used[m[1]] = true;
    written.forEach(function (n) {
      if (!home[n] && problems.indexOf(n) < 0) {
        problems.push('`' + n + '` is not part of the Nova64 API, so it was dropped from the imports.');
      }
    });
    var byGroup = {}, names = Object.keys(used).sort();
    names.forEach(function (n) { (byGroup[home[n]] = byGroup[home[n]] || []).push(n); });
    var header = Object.keys(byGroup).map(function (g) {
      return 'const { ' + byGroup[g].join(', ') + ' } = nova64.' + g + ';';
    }).join('\n');
    var before = written.slice().sort().join(',');
    if (names.length && before !== names.join(',')) fixes.push('Added the exact nova64 imports for ' + names.length + ' API names.');
    return (header ? header + '\n\n' : '') + body.replace(/^\s*\n/, '');
  }

  /** nova64.<wrong>.<name> -> nova64.<home>.<name> when the name exists in exactly one other group. */
  function regroupApiRefs(code, fixes) {
    var ns = DATA ? DATA.namespace : {}, home = apiHome(), moved = {};
    var masked = maskSource(code), out = '', last = 0, re = /\bnova64\.(\w+)\.(\w+)/g, m;
    while ((m = re.exec(masked))) {
      if (ns[m[1]] && ns[m[1]].indexOf(m[2]) >= 0) continue;
      if (!home[m[2]]) continue;
      out += code.slice(last, m.index) + 'nova64.' + home[m[2]] + '.' + m[2];
      last = m.index + m[0].length;
      moved[m[1] + '.' + m[2]] = home[m[2]];
    }
    var keys = Object.keys(moved);
    if (!keys.length) return code;
    fixes.push('Moved ' + keys.map(function (k) { return 'nova64.' + k + ' to nova64.' + moved[k]; }).join(', ') + '.');
    return out + code.slice(last);
  }

  function unknownApiRefs(code) {
    var ns = DATA ? DATA.namespace : {}, out = [], seen = {};
    var re = /\bnova64\.(\w+)\.(\w+)/g, m, masked = maskSource(code);
    while ((m = re.exec(masked))) {
      var key = m[1] + '.' + m[2];
      if (seen[key]) continue;
      seen[key] = true;
      if (!ns[m[1]]) out.push('nova64.' + m[1] + ' is not a Nova64 namespace.');
      else if (ns[m[1]].indexOf(m[2]) < 0) {
        var home = apiHome()[m[2]];
        out.push('nova64.' + key + ' does not exist' + (home ? ' (it lives in nova64.' + home + ')' : '') + '.');
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- template splicing

  function constNames(config) {
    var out = [], re = /^const ([A-Z_][A-Z0-9_]*)\b/gm, m;
    while ((m = re.exec(config))) out.push(m[1]);
    return out;
  }

  /** The `const NAME = ...;` block for NAME in a CONFIG, up to the next top-level const. */
  function constBlock(config, name) {
    var re = new RegExp('^const ' + name + '\\b[\\s\\S]*?(?=^const [A-Z_]|^// =====|(?![\\s\\S]))', 'm');
    var m = re.exec(config);
    return m ? m[0].replace(/\s+$/, '') : null;
  }

  function checkSyntax(src) {
    try { new Function(src); return null; } catch (e) { return e && e.message ? e.message : String(e); }
  }

  function spliceTemplate(id, code, fixes, problems) {
    var t = getTemplate(id);
    var config = configOf(code) || '';
    if (config.indexOf(CONFIG_MARK) < 0) {
      config = config.replace(TEMPLATE_RE, function (line) { return line + '\n' + CONFIG_MARK; });
    }
    // Pure black disappears against the dark scenes every template uses.
    var blacks = config.match(/0x0{6}\b/g);
    if (blacks) {
      config = config.replace(/0x0{6}\b/g, '0x0c1430');
      fixes.push('Replaced ' + blacks.length + ' pure-black colour(s) with a dark tint so they stay visible.');
    }
    config = config.replace(/^\s*(const|let|var)\s+MAP\b[\s\S]*?;\s*$/m, function () {
      fixes.push('Removed a hand-drawn MAP; the engine generates levels itself.');
      return '';
    });
    var restored = [];
    constNames(t.config).forEach(function (name) {
      if (!new RegExp('^const ' + name + '\\b', 'm').test(config)) {
        config = config.replace(/\s+$/, '') + '\n\n' + constBlock(t.config, name) + '\n';
        restored.push(name);
      }
    });
    if (restored.length) fixes.push('Kept the template\'s ' + restored.join(', ') + ' (missing from the AI\'s CONFIG).');
    var syntax = checkSyntax(config);
    if (syntax) {
      problems.push('The AI\'s CONFIG had a syntax error (' + syntax + '), so the template\'s example CONFIG is running instead. Ask again to retry.');
      config = t.config;
    }
    var engine = DATA.engines[t.family];
    var split = engine.indexOf(ENGINE_MARK);
    return engine.slice(0, split).replace(/\s+$/, '') + '\n\n' + config.replace(/\s+$/, '') + '\n\n' + engine.slice(split);
  }

  // ---------------------------------------------------------------- prepare

  /**
   * Turn whatever the AI (or an example) produced into a cart that runs in studio mode.
   * Returns { code, templateId, fixes: string[], problems: string[] }.
   */
  function prepare(input) {
    var code = String(input || '').replace(/\r\n/g, '\n');
    var fixes = [], problems = [];
    // The app's reply markers sometimes land inside the code block (a model that
    // closes the fence after its [EXPLAIN] notes). They are never cart code.
    var stripped = code.replace(/(^|\n)[ \t]*\[EXPLAIN\][\s\S]*?(?:\[\/EXPLAIN\][^\n]*|(?![\s\S]))/g, '$1')
      .replace(/^[ \t]*\[\/?(?:INSERT_CODE|RUN_SCENE|EXPLAIN)\][ \t]*\n?/gm, '');
    if (stripped !== code) { fixes.push('Removed the reply\'s [EXPLAIN]/[INSERT_CODE] notes from the code.'); code = stripped; }
    stripped = code.replace(/^[ \t]*import\s[^\n]*\n?/gm, '');
    if (stripped !== code) { fixes.push('Removed import lines (carts run as scripts).'); code = stripped; }
    stripped = code.replace(/^([ \t]*)export\s+(default\s+)?(?=(async\s+)?function|const|let|var|class)/gm, '$1');
    if (stripped !== code) { fixes.push('Removed export keywords (carts run as scripts).'); code = stripped; }

    var templateId = templateIdOf(code);
    if (templateId) code = spliceTemplate(templateId, code, fixes, problems);

    code = normalizeImports(code, fixes, problems);

    var masked = maskSource(code);
    var hasMeshes = /\bcreate(Cube|Sphere|Plane|Cylinder|Cone|Capsule|Torus|InstancedMesh)\s*\(|\bloadModel\s*\(/.test(masked);
    var draw = functionBody(masked, 'draw');
    if (hasMeshes && draw) {
      var body = code.slice(draw[0], draw[1]);
      var maskedBody = masked.slice(draw[0], draw[1]);
      var re = /(^|[^\w$.])((?:nova64\.draw\.)?cls\s*\([^()]*\)\s*;?)/g, edits = [], m;
      while ((m = re.exec(maskedBody))) edits.push([m.index + m[1].length, m[2].length]);
      for (var e = edits.length - 1; e >= 0; e--) {
        body = body.slice(0, edits[e][0]) + '/* cls() removed: it paints over the 3D scene */' + body.slice(edits[e][0] + edits[e][1]);
      }
      if (edits.length) {
        code = code.slice(0, draw[0]) + body + code.slice(draw[1]);
        fixes.push('Removed cls() from draw(); in a 3D cart it hides the whole scene.');
        masked = maskSource(code);
      }
    }
    if (!functionBody(masked, 'init') && !functionBody(masked, 'update')) {
      problems.push('The cart has no init() or update() function, so nothing will run.');
    }
    ['init', 'update', 'draw'].forEach(function (name) {
      var b = functionBody(masked, name);
      if (b && /\bthis\./.test(masked.slice(b[0], b[1]))) {
        problems.push('`this.` inside ' + name + '() is undefined in a cart; use top-level let variables.');
      }
    });
    code = regroupApiRefs(code, fixes);
    problems = problems.concat(unknownApiRefs(code));
    var syntax = checkSyntax(code);
    if (syntax) problems.push('Syntax error: ' + syntax);
    return { code: code, templateId: templateId, fixes: fixes, problems: problems };
  }

  /** A short human summary of a prepare() result, or '' when nothing happened. */
  function summarize(result) {
    var lines = [];
    if (result.templateId) {
      var t = getTemplate(result.templateId);
      lines.push('Built on the tested ' + t.genre.toLowerCase() + ' engine (' + t.style + ').');
    }
    result.fixes.forEach(function (f) { lines.push('Fixed: ' + f); });
    result.problems.forEach(function (p) { lines.push('Check: ' + p); });
    return lines.join('\n');
  }

  // ---------------------------------------------------------------- repair

  /** Bounded, visible repair attempts for carts prepare() could not fix. */
  var MAX_REPAIRS = 2;

  /** One compact repair message: the concrete problems, then the cart to fix. */
  function repairPrompt(code, problems) {
    return [
      'Your Nova64 cart has problems that must be fixed:'
    ].concat(problems.map(function (p) { return '- ' + p; }), [
      '',
      'Return the complete corrected cart in one ```javascript block. Keep everything that works;',
      'change only what is needed. Plain function init/update/draw, no import or export,',
      'and use only real nova64.* API names.',
      '',
      '```javascript',
      code,
      '```'
    ]).join('\n');
  }

  var api = {
    version: DATA ? DATA.version : null,
    templates: templates,
    getTemplate: getTemplate,
    templateIdOf: templateIdOf,
    chooseTemplate: chooseTemplate,
    pickTemplate: pickTemplate,
    templateNote: templateNote,
    chipLabel: chipLabel,
    configOf: configOf,
    templatePrompt: templatePrompt,
    prepare: prepare,
    summarize: summarize,
    repairPrompt: repairPrompt,
    MAX_REPAIRS: MAX_REPAIRS,
    CONFIG_MARK: CONFIG_MARK,
    ENGINE_MARK: ENGINE_MARK
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.Nova64Kit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
