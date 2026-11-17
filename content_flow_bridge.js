(() => {
  if (window.__BIGBOMB_FLOW_BRIDGE__) return;
  window.__BIGBOMB_FLOW_BRIDGE__ = true;

  chrome.runtime.sendMessage({ type:"FLOW_BRIDGE_READY" }).catch(() => {});

  window.addEventListener("message",(event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (data?.source === "BIGBOMB_FLOW" && data?.type === "READY") {
      chrome.runtime.sendMessage({ type:"FLOW_BRIDGE_READY" }).catch(() => {});
      return;
    }
    if (data?.source !== "BIGBOMB_FLOW" || data?.type !== "TOKEN" || typeof data.token !== "string" || !data.token.startsWith("ya29.")) return;
    chrome.runtime.sendMessage({ type:"CAPTURE_FLOW_TOKEN",token:data.token }).catch(() => {});
  });
})();
