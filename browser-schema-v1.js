(function () {
  async function digest32(str) {
    if (!crypto || !crypto.subtle) return null;
    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("").slice(0, 32);
  }

  async function canvasMd5(draw) {
    try {
      var c = document.createElement("canvas");
      c.width = 220; c.height = 60;
      var ctx = c.getContext("2d");
      if (!ctx) return null;
      draw(ctx, c);
      return await digest32(c.toDataURL());
    } catch (e) { return null; }
  }

  function webglInfo() {
    try {
      var c = document.createElement("canvas");
      var gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (!gl) return null;
      var dbg = gl.getExtension("WEBGL_debug_renderer_info");
      var exts = gl.getSupportedExtensions() || [];
      var param = function (p) { try { return gl.getParameter(p); } catch (e) { return null; } };
      var sp = function (shader) {
        var out = {};
        ["HIGH_FLOAT", "MEDIUM_FLOAT", "LOW_FLOAT"].forEach(function (prec) {
          var f = gl.getShaderPrecisionFormat(shader, gl[prec]);
          out[prec] = f ? { precision: f.precision, rangeMin: f.rangeMin, rangeMax: f.rangeMax } : null;
        });
        return out;
      };
      return {
        vendor: param(gl.VENDOR),
        renderer: param(gl.RENDERER),
        version: param(gl.VERSION),
        shadingLanguageVersion: param(gl.SHADING_LANGUAGE_VERSION),
        unmaskedVendor: dbg ? param(dbg.UNMASKED_VENDOR_WEBGL) : null,
        unmaskedRenderer: dbg ? param(dbg.UNMASKED_RENDERER_WEBGL) : null,
        extensions: exts.slice().sort(),
        antialias: !!gl.getContextAttributes().antialias,
        parameters: {
          ALIASED_LINE_WIDTH_RANGE: param(gl.ALIASED_LINE_WIDTH_RANGE),
          ALIASED_POINT_SIZE_RANGE: param(gl.ALIASED_POINT_SIZE_RANGE),
          ALPHA_BITS: param(gl.ALPHA_BITS),
          BLUE_BITS: param(gl.BLUE_BITS),
          DEPTH_BITS: param(gl.DEPTH_BITS),
          GREEN_BITS: param(gl.GREEN_BITS),
          MAX_TEXTURE_MAX_ANISOTROPY_EXT: param(0x84FF),
          MAX_COMBINED_TEXTURE_IMAGE_UNITS: param(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
          MAX_CUBE_MAP_TEXTURE_SIZE: param(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
          MAX_FRAGMENT_UNIFORM_VECTORS: param(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
          MAX_RENDERBUFFER_SIZE: param(gl.MAX_RENDERBUFFER_SIZE),
          MAX_TEXTURE_IMAGE_UNITS: param(gl.MAX_TEXTURE_IMAGE_UNITS),
          MAX_TEXTURE_SIZE: param(gl.MAX_TEXTURE_SIZE),
          MAX_VARYING_VECTORS: param(gl.MAX_VARYING_VECTORS),
          MAX_VERTEX_ATTRIBS: param(gl.MAX_VERTEX_ATTRIBS),
          MAX_VERTEX_TEXTURE_IMAGE_UNITS: param(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
          MAX_VERTEX_UNIFORM_VECTORS: param(gl.MAX_VERTEX_UNIFORM_VECTORS),
          MAX_VIEWPORT_DIMS: param(gl.MAX_VIEWPORT_DIMS),
          STENCIL_BITS: param(gl.STENCIL_BITS)
        },
        shaderPrecision: {
          VERTEX_SHADER: sp(gl.VERTEX_SHADER),
          FRAGMENT_SHADER: sp(gl.FRAGMENT_SHADER)
        }
      };
    } catch (e) { return null; }
  }

  function pluginsList() {
    var out = [];
    try {
      for (var i = 0; i < navigator.plugins.length; i++) {
        var p = navigator.plugins[i];
        var mimes = [];
        for (var j = 0; j < p.length; j++) {
          mimes.push({ type: p[j].type, suffixes: p[j].suffixes });
        }
        out.push({ name: p.name, filename: p.filename, description: p.description, mimeTypes: mimes });
      }
    } catch (e) {}
    return out;
  }

  async function collectBrowserSchemaV1() {
    var nav = navigator;
    var conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    var uad = null;
    try {
      if (nav.userAgentData && nav.userAgentData.getHighEntropyValues) {
        uad = await nav.userAgentData.getHighEntropyValues([
          "architecture", "bitness", "model", "platformVersion", "uaFullVersion"
        ]);
        uad.brands = nav.userAgentData.brands;
        uad.mobile = nav.userAgentData.mobile;
        uad.platform = nav.userAgentData.platform;
      }
    } catch (e) {}
    return {
      schema_version: 1,
      browser: {
        navigator: {
          userAgent: nav.userAgent,
          platform: nav.platform,
          language: nav.language,
          languages: nav.languages ? nav.languages.slice() : [nav.language],
          hardwareConcurrency: nav.hardwareConcurrency,
          deviceMemory: nav.deviceMemory,
          maxTouchPoints: nav.maxTouchPoints,
          doNotTrackPresent: nav.doNotTrack != null,
          onLine: nav.onLine,
          pdfViewerEnabled: nav.pdfViewerEnabled,
          connection: conn ? {
            rtt: conn.rtt,
            downlink: conn.downlink,
            saveData: conn.saveData,
            effectiveType: conn.effectiveType
          } : null,
          userAgentData: uad,
          webdriver: !!nav.webdriver,
          plugins: pluginsList()
        },
        screen: {
          width: screen.width,
          height: screen.height,
          availWidth: screen.availWidth,
          availHeight: screen.availHeight,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth
        },
        window: {
          innerWidth: innerWidth,
          innerHeight: innerHeight,
          outerWidth: outerWidth,
          outerHeight: outerHeight,
          screenX: window.screenX,
          screenY: window.screenY,
          scrollX: scrollX,
          scrollY: scrollY
        },
        intl: {
          timeZone: (Intl.DateTimeFormat().resolvedOptions().timeZone || null)
        },
        webgl: webglInfo(),
        rendering: {
          webglTriangleMD5: await canvasMd5(function (ctx) {
            ctx.fillStyle = "#f60";
            ctx.fillRect(0, 0, 120, 20);
            ctx.fillStyle = "#069";
            ctx.font = "16px Arial";
            ctx.fillText("PX schema v1", 2, 15);
          }),
          emojiCanvasMD5: await canvasMd5(function (ctx) {
            ctx.font = "32px Arial";
            ctx.fillText("\uD83D\uDE00", 0, 32);
          }),
          multilingualCanvasMD5: await canvasMd5(function (ctx) {
            ctx.font = "18px Arial";
            ctx.fillText("A\u044F\u6D4B", 0, 20);
          })
        },
        http: {
          acceptLanguage: nav.languages ? nav.languages.join(",") : nav.language
        }
      }
    };
  }

  function postBrowserSchema(extra) {
    return collectBrowserSchemaV1().then(function (schema) {
      return fetch("/browser-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({
          schema: schema,
          href: location.href,
          origin: location.origin
        }, extra || {}))
      });
    });
  }

  window.collectBrowserSchemaV1 = collectBrowserSchemaV1;
  window.postBrowserSchema = postBrowserSchema;
  postBrowserSchema().catch(function () {});
})();
