/**
 * RoboCADer Pro — Browser error monitoring
 *
 * Loads the official Sentry browser SDK from CDN and wraps it in a small
 * facade (`window.RoboMonitor`) that the dashboards call. Application code
 * never touches `Sentry.*` directly, so the SDK can be swapped or dropped
 * without touching a single page.
 *
 * USAGE — put this before your page scripts:
 *   <script src="/js/monitoring.js"></script>
 *   <script>
 *     RoboMonitor.init({
 *       dsn: "https://<key>@<org>.ingest.sentry.io/<project>",
 *       environment: "production",
 *       release: "robocader-pro@0.1.0"
 *     });
 *   </script>
 *
 * THREE THINGS THIS DOES THAT A PLAIN Sentry.init() DOES NOT:
 *
 *   1. NEVER BLOCKS THE PAGE. The SDK loads async. Errors thrown before it
 *      arrives are queued and replayed once it does. A plant-floor tablet on
 *      a throttled connection still gets a working onboarding form.
 *
 *   2. SURVIVES A BLOCKED CDN. Corporate and plant networks routinely block
 *      third-party CDNs, and ad blockers block Sentry by name. If the SDK
 *      fails to load, the facade stays functional and degrades to console
 *      logging — it never throws at a call site.
 *
 *   3. SCRUBS PII BEFORE SEND. Technician phone numbers, OTPs, JWTs and the
 *      Supabase anon key are stripped from every event, including URLs and
 *      breadcrumbs. Migration 002 hides phone_number at the database layer;
 *      leaking it through an error report would defeat that entirely.
 */

(function (global) {
  "use strict";

  var SDK_URL = "https://browser.sentry-cdn.com/8.42.0/bundle.min.js";
  var SDK_INTEGRITY = null; // set to the SRI hash from Sentry's docs to pin it

  var state = {
    ready: false,
    failed: false,
    initialised: false,
    queue: [],      // events raised before the SDK finished loading
    config: {},
  };

  var MAX_QUEUE = 30;

  // -------------------------------------------------------------------------
  // Scrubbing — mirrors api/lib/sentry.js. Keep the three copies in step.
  // -------------------------------------------------------------------------

  var REDACTIONS = [
    [/\+\d{8,15}\b/g, "[phone]"],
    [/\b[6-9]\d{9}\b/g, "[phone]"],
    [/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "[email]"],
    [/\beyJ[\w-]*\.[\w-]*\.[\w-]*/g, "[jwt]"],
    [/\bBearer\s+[\w\-._~+/]+=*/gi, "Bearer [redacted]"],
    [/\b\d{4,8}\b(?=\s*(otp|code))/gi, "[otp]"],
    [/\bAIza[\w-]{20,}/g, "[google_key]"]
  ];

  var SECRET_KEYS =
    /^(authorization|apikey|api_key|password|secret|token|phone|phone_number|otp|full_name)$/i;

  function scrubString(value) {
    var output = String(value);
    for (var i = 0; i < REDACTIONS.length; i++) {
      output = output.replace(REDACTIONS[i][0], REDACTIONS[i][1]);
    }
    return output.length > 2000 ? output.slice(0, 2000) + "…[truncated]" : output;
  }

  function scrub(value, depth) {
    depth = depth || 0;
    if (depth > 5) return "[max_depth]";
    if (value === null || value === undefined) return value;
    if (typeof value === "string") return scrubString(value);
    if (typeof value !== "object") return value;

    if (Object.prototype.toString.call(value) === "[object Array]") {
      return value.slice(0, 30).map(function (item) { return scrub(item, depth + 1); });
    }

    var output = {};
    for (var key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      output[key] = SECRET_KEYS.test(key) ? "[redacted]" : scrub(value[key], depth + 1);
    }
    return output;
  }

  /** Query strings on our own pages can carry a phone or a token. */
  function scrubUrl(url) {
    if (!url) return url;
    try {
      var parsed = new URL(url, global.location && global.location.href);
      var sensitive = ["phone", "token", "access_token", "refresh_token", "otp", "apikey"];
      for (var i = 0; i < sensitive.length; i++) {
        if (parsed.searchParams.has(sensitive[i])) parsed.searchParams.set(sensitive[i], "[redacted]");
      }
      return scrubString(parsed.toString());
    } catch (e) {
      return scrubString(url);
    }
  }

  // -------------------------------------------------------------------------
  // Noise filter — errors that are not ours and are not actionable
  // -------------------------------------------------------------------------

  var IGNORED = [
    /ResizeObserver loop/i,
    /Non-Error promise rejection captured/i,
    /^Script error\.?$/i,               // cross-origin, zero detail
    /Failed to fetch.*extension/i,
    /chrome-extension:|moz-extension:|safari-extension:/i,
    /Load failed$/i                     // iOS Safari's opaque network abort
  ];

  function isIgnorable(message) {
    if (!message) return false;
    for (var i = 0; i < IGNORED.length; i++) {
      if (IGNORED[i].test(message)) return true;
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // beforeSend
  // -------------------------------------------------------------------------

  function beforeSend(event, hint) {
    try {
      var firstValue = event.exception &&
        event.exception.values &&
        event.exception.values[0] &&
        event.exception.values[0].value;

      if (isIgnorable(firstValue) || isIgnorable(event.message)) return null;

      if (event.request) {
        if (event.request.url) event.request.url = scrubUrl(event.request.url);
        delete event.request.cookies;
        delete event.request.headers;
        if (event.request.data) event.request.data = scrub(event.request.data);
      }

      if (event.exception && event.exception.values) {
        for (var i = 0; i < event.exception.values.length; i++) {
          if (event.exception.values[i].value) {
            event.exception.values[i].value = scrubString(event.exception.values[i].value);
          }
        }
      }

      if (event.message) event.message = scrubString(event.message);
      if (event.extra) event.extra = scrub(event.extra);
      if (event.tags) event.tags = scrub(event.tags);

      // Identify the account, never the person.
      if (event.user) {
        event.user = { id: event.user.id, role: event.user.role };
      }

      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(function (crumb) {
          if (crumb.message) crumb.message = scrubString(crumb.message);
          if (crumb.data) {
            crumb.data = scrub(crumb.data);
            if (crumb.data.url) crumb.data.url = scrubUrl(crumb.data.url);
          }
          return crumb;
        });
      }

      return event;
    } catch (error) {
      // A throwing beforeSend would break the SDK. Drop the event instead.
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Queue replay
  // -------------------------------------------------------------------------

  function enqueue(entry) {
    if (state.queue.length >= MAX_QUEUE) state.queue.shift();
    state.queue.push(entry);
  }

  function drainQueue() {
    if (!state.ready) return;
    var pending = state.queue.splice(0, state.queue.length);
    for (var i = 0; i < pending.length; i++) {
      try {
        if (pending[i].kind === "exception") {
          global.Sentry.captureException(pending[i].error, { extra: pending[i].context });
        } else if (pending[i].kind === "message") {
          global.Sentry.captureMessage(pending[i].message, pending[i].level);
        } else if (pending[i].kind === "breadcrumb") {
          global.Sentry.addBreadcrumb(pending[i].crumb);
        }
      } catch (error) {
        /* nothing further to do */
      }
    }
  }

  // -------------------------------------------------------------------------
  // SDK loading
  // -------------------------------------------------------------------------

  function loadSdk(onDone) {
    if (global.Sentry) return onDone(true);

    var script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    if (SDK_INTEGRITY) script.integrity = SDK_INTEGRITY;

    var settled = false;
    function settle(ok) {
      if (settled) return;
      settled = true;
      onDone(ok);
    }

    script.onload = function () { settle(Boolean(global.Sentry)); };
    script.onerror = function () { settle(false); };

    // Blocked requests can hang rather than fire onerror.
    setTimeout(function () { settle(Boolean(global.Sentry)); }, 8000);

    document.head.appendChild(script);
  }

  // -------------------------------------------------------------------------
  // Public facade
  // -------------------------------------------------------------------------

  var RoboMonitor = {
    init: function (config) {
      if (state.initialised) return;
      state.initialised = true;
      state.config = config || {};

      if (!state.config.dsn) {
        console.info("[RoboMonitor] No DSN supplied — running in local-log mode.");
        state.failed = true;
        return;
      }

      loadSdk(function (ok) {
        if (!ok) {
          state.failed = true;
          console.warn("[RoboMonitor] Sentry SDK unavailable (CDN blocked?) — local-log mode.");
          return;
        }

        try {
          global.Sentry.init({
            dsn: state.config.dsn,
            environment: state.config.environment || "development",
            release: state.config.release || "robocader-pro@dev",
            // Errors are cheap and rare; traces are neither. Sample accordingly.
            sampleRate: 1.0,
            tracesSampleRate: state.config.tracesSampleRate || 0.1,
            // Off by default: replays of an onboarding form capture keystrokes.
            replaysSessionSampleRate: 0,
            replaysOnErrorSampleRate: state.config.replaysOnErrorSampleRate || 0,
            sendDefaultPii: false,
            attachStacktrace: true,
            maxBreadcrumbs: 30,
            ignoreErrors: IGNORED,
            beforeSend: beforeSend,
            beforeBreadcrumb: function (crumb) {
              // Console breadcrumbs echo whatever the app logged, including
              // anything a developer left in. Not worth the leak risk.
              if (crumb.category === "console") return null;
              if (crumb.data && crumb.data.url) crumb.data.url = scrubUrl(crumb.data.url);
              return crumb;
            }
          });

          global.Sentry.setTag("app", "robocader-pro");
          if (state.config.surface) global.Sentry.setTag("surface", state.config.surface);

          state.ready = true;
          drainQueue();
        } catch (error) {
          state.failed = true;
          console.warn("[RoboMonitor] Sentry init failed:", error && error.message);
        }
      });
    },

    captureException: function (error, context) {
      var safeContext = scrub(context || {});
      console.error("[RoboMonitor]", error && error.message, safeContext);

      if (state.ready && global.Sentry) {
        global.Sentry.captureException(error, { extra: safeContext });
      } else if (!state.failed) {
        enqueue({ kind: "exception", error: error, context: safeContext });
      }
    },

    captureMessage: function (message, level) {
      var safe = scrubString(message);
      if (state.ready && global.Sentry) global.Sentry.captureMessage(safe, level || "info");
      else if (!state.failed) enqueue({ kind: "message", message: safe, level: level || "info" });
    },

    addBreadcrumb: function (category, message, data) {
      var crumb = {
        category: category,
        message: scrubString(message),
        level: "info",
        data: scrub(data || {})
      };
      if (state.ready && global.Sentry) global.Sentry.addBreadcrumb(crumb);
      else if (!state.failed) enqueue({ kind: "breadcrumb", crumb: crumb });
    },

    /** Account identity only — never name, phone or email. */
    setUser: function (user) {
      if (!state.ready || !global.Sentry) return;
      global.Sentry.setUser(user ? { id: user.id, role: user.role } : null);
    },

    clearUser: function () {
      if (state.ready && global.Sentry) global.Sentry.setUser(null);
    },

    /**
     * Records a form validation failure. Field NAMES are useful signal;
     * field VALUES never leave the device.
     */
    trackFormError: function (formName, fieldErrors) {
      var fields = Object.keys(fieldErrors || {});
      RoboMonitor.addBreadcrumb("form", "Validation failed: " + formName, { fields: fields });
      RoboMonitor.captureMessage(
        "Form validation failed: " + formName + " [" + fields.join(", ") + "]",
        "warning"
      );
    },

    /**
     * Wraps a Supabase/fetch call so failures are reported with useful context
     * instead of surfacing as a bare unhandled rejection.
     */
    wrapAsync: function (operation, fn) {
      return function () {
        var args = Array.prototype.slice.call(arguments);
        RoboMonitor.addBreadcrumb("operation", operation);
        try {
          var result = fn.apply(this, args);
          if (result && typeof result.catch === "function") {
            return result.catch(function (error) {
              RoboMonitor.captureException(error, { operation: operation });
              throw error;
            });
          }
          return result;
        } catch (error) {
          RoboMonitor.captureException(error, { operation: operation });
          throw error;
        }
      };
    },

    /** Reports a Supabase PostgrestError, which is a plain object, not an Error. */
    captureSupabaseError: function (error, operation) {
      if (!error) return;
      var wrapped = new Error(
        "[" + (error.code || "unknown") + "] " + (error.message || "Supabase error")
      );
      wrapped.name = "SupabaseError";
      RoboMonitor.captureException(wrapped, {
        operation: operation,
        pg_code: error.code,
        hint: error.hint,
        // 42501 is our RLS/column-privilege denial — usually a policy bug or a
        // `select('*')` that trips the revoked phone_number column (see 002).
        likely_rls: error.code === "42501" || error.code === "PGRST301"
      });
    },

    isReady: function () { return state.ready; }
  };

  // -------------------------------------------------------------------------
  // Global handlers — installed immediately so nothing is missed while the
  // SDK is still loading.
  // -------------------------------------------------------------------------

  global.addEventListener("error", function (event) {
    if (isIgnorable(event.message)) return;
    if (state.ready) return;   // SDK owns this once it is up
    RoboMonitor.captureException(event.error || new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      pre_sdk: true
    });
  });

  global.addEventListener("unhandledrejection", function (event) {
    if (state.ready) return;
    var reason = event.reason;
    var error = reason instanceof Error ? reason : new Error(String(reason));
    RoboMonitor.captureException(error, { pre_sdk: true, type: "unhandledrejection" });
  });

  global.RoboMonitor = RoboMonitor;
})(typeof window !== "undefined" ? window : this);
