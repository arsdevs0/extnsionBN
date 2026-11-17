/* Image preparation and codec for the observed Flow Angular RPC. No session values stored. */
(function(root) {
  async function prepareUploadImage(dataUrl, fileName, {preserveOriginal=false}={}) {
    let bitmap;
    try {
      const match = String(dataUrl || '').match(/^data:(image\/[^;,]+);base64,([\s\S]+)$/i);
      if (!match) throw new Error('Reference must be an image Base64 data URL.');
      const binary = atob(match[2].replace(/\s/g, ''));
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      bitmap = await createImageBitmap(new Blob([bytes], {type: match[1]}));
      if (!bitmap.width || !bitmap.height) throw new Error('Reference has no image dimensions.');
      const base = String(fileName || 'reference').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 120) || 'reference';
      if (preserveOriginal) {
        // Recover with the source file instead of the padded/re-encoded JPEG.
        // Identify its actual format so mislabeled data URLs cannot send a PNG
        // body under a JPEG MIME type. Decoding above still rejects corrupt data.
        const png=[137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value);
        const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
        const webp=binary.slice(0,4)==='RIFF'&&binary.slice(8,12)==='WEBP';
        const mimeType=png?'image/png':jpeg?'image/jpeg':webp?'image/webp':null;
        if(!mimeType)throw Error('Original-byte recovery requires a JPEG, PNG or WebP reference.');
        const extension=png?'png':jpeg?'jpg':'webp';
        return {imageBytes:btoa(binary),mimeType,fileName:`${base}.${extension}`};
      }

      // Match the supplied Auto Flow adapter's reference preparation (voices U):
      // fit the entire image into a 1920x1080 / 1080x1920 JPEG, without cropping.
      const landscape = bitmap.width >= bitmap.height;
      const width = landscape ? 1920 : 1080;
      const height = landscape ? 1080 : 1920;
      const scale = Math.min(width / bitmap.width, height / bitmap.height);
      const imageWidth = Math.max(1, Math.round(bitmap.width * scale));
      const imageHeight = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not initialize image conversion.');
      context.fillStyle = '#000000';
      context.fillRect(0, 0, width, height);
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, Math.round((width - imageWidth) / 2), Math.round((height - imageHeight) / 2), imageWidth, imageHeight);
      const jpeg = await canvas.convertToBlob({type: 'image/jpeg', quality: 0.95});
      if (jpeg.type !== 'image/jpeg' || !jpeg.size) throw new Error('JPEG conversion returned no image.');
      const encoded = new Uint8Array(await jpeg.arrayBuffer());
      let output = '';
      for (let offset = 0; offset < encoded.length; offset += 32768) {
        output += String.fromCharCode(...encoded.subarray(offset, offset + 32768));
      }
      return {imageBytes: btoa(output), mimeType: 'image/jpeg', fileName: `${base}.jpg`};
    } catch (cause) {
      const error = new Error(`Could not prepare Flow reference image: ${cause.message}`);
      error.code = 'FLOW_UPLOAD_INVALID_IMAGE';
      throw error;
    } finally {
      bitmap?.close();
    }
  }

  function buildUploadRequest({projectId, imageBytes, mimeType, fileName, challengeToken, requestId, clientId}) {
    for (const value of [projectId, imageBytes, mimeType, fileName, challengeToken, requestId, clientId]) {
      if (typeof value !== 'string' || !value) throw new Error('Incomplete Flow upload request');
    }
    const context = [null, 22, null, null, null, projectId, null, null, null, null, [challengeToken, 1]];
    const payload = [context, imageBytes, mimeType, 1, null, null, null, null, fileName, null, requestId, clientId];
    return JSON.stringify([[['maseQ', JSON.stringify(payload), null, 'generic']]]);
  }

  function buildProjectCreateRequest(rpcId, title) {
    if (typeof rpcId !== 'string' || !rpcId || typeof title !== 'string' || !title.trim()) {
      throw new Error('Incomplete Flow project creation request');
    }
    // Flow's current project_create schema: ["projects/*", [null, [title]], [null, 22]].
    const payload = ['projects/*', [null, [title]], [null, 22]];
    return JSON.stringify([[[rpcId, JSON.stringify(payload), null, 'generic']]]);
  }

  function buildGenerationRequest({projectId,prompt,model,aspectCode,referenceIds=[],challengeToken,seed,requestId,clientId,batchId}) {
    for(const value of [projectId,prompt,model,challengeToken,requestId,clientId,batchId])if(typeof value!=='string'||!value.trim())throw Error('Incomplete Flow generation request');
    if(![1,2,3,4,5].includes(aspectCode)||!Number.isInteger(seed)||seed<0||seed>=2**31)throw Error('Invalid Flow generation settings');
    if(!Array.isArray(referenceIds)||referenceIds.length>9||referenceIds.some(id=>typeof id!=='string'||!id))throw Error('Invalid Flow reference IDs');
    const context=[null,22,null,null,null,projectId,null,null,null,null,[challengeToken,1]];
    const request=Array(14).fill(null);
    if(referenceIds.length)request[2]=referenceIds.map(id=>[id,null,null,null,1]);
    request[3]=seed;request[4]=aspectCode;request[5]=model;request[7]=context;request[8]=[[[prompt]]];request[12]=requestId;request[13]=clientId;
    // Same ordinary-image layout as the supplied 10.9.1 adapter's Dr builder,
    // including outer client context, per-request IDs and the batch ID.
    return JSON.stringify([[['ogiZ0b',JSON.stringify([null,[request],1,context,[batchId]]),null,'generic']]]);
  }

  function parseProjectCreateResponse(text, rpcId) {
    const data = parseRpcPayload(String(text), rpcId);
    const projectId = data?.[0];
    if (typeof projectId !== 'string' || !/^[a-zA-Z0-9_-]{8,}$/.test(projectId)) {
      throw new Error('Flow project_create returned no valid project ID');
    }
    return {projectId};
  }

  function parseUploadResponse(text, expectedProjectId) {
    // Use the same frame scanner as the generation RPC. Flow sometimes returns
    // an error row (or a null wrb.fr payload) beside the upload row; the old
    // line-only parser discarded that diagnostic and reported only “no payload”.
    const data = parseRpcPayload(String(text), 'maseQ');
    const media = data?.[0];
    const asset = data?.[1];
    if (media?.[1] !== expectedProjectId || asset?.[4] !== expectedProjectId) {
      throw new Error('Flow upload response belongs to another project');
    }
    if (typeof media?.[0] !== 'string' || !media[0].trim() || typeof asset?.[0] !== 'string' || !asset[0].trim()
      || media[2] !== asset[0] || asset?.[3]?.[4] !== media[0]) {
      throw new Error(`Unrecognized Flow upload media/asset mapping (payload shape ${Array.isArray(data) ? `array(${data.length})` : typeof data}).`);
    }
    const fileName = typeof asset?.[3]?.[0] === 'string' ? asset[3][0].trim() : '';
    return {mediaId: media[0], assetId: asset[0], projectId: media[1], ...(fileName ? {fileName} : {})};
  }
  function parseRpcPayload(text, rpcId) {
    const rows = [];
    // Scan complete JSON frames, respecting escaped quotes and brackets in strings.
    for (let pos = 0; pos < text.length;) {
      const start = text.indexOf('[', pos);
      if (start < 0) break;
      let depth = 0, quoted = false, escaped = false, end = -1;
      for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
          if (escaped) escaped = false;
          else if (ch === '\\') escaped = true;
          else if (ch === '"') quoted = false;
        } else if (ch === '"') quoted = true;
        else if (ch === '[') depth++;
        else if (ch === ']' && --depth === 0) { end = i; break; }
      }
      if (end < 0) break;
      try { rows.push(...JSON.parse(text.slice(start, end + 1))); } catch {}
      pos = end + 1;
    }
    const row = rows.find(value => value?.[0] === 'wrb.fr' && value[1] === rpcId);
    const error = rows.find(value => value?.[0] === 'er' && value[1] === rpcId);
    if (!row || typeof row[2] !== 'string') {
      const flag = row?.[5];
      const code = error?.[9] ?? (Array.isArray(flag) ? flag[0] : null);
      const names = { 1: 'CANCELLED', 2: 'UNKNOWN', 3: 'INVALID_ARGUMENT', 4: 'DEADLINE_EXCEEDED', 5: 'NOT_FOUND', 6: 'ALREADY_EXISTS', 7: 'PERMISSION_DENIED', 8: 'RESOURCE_EXHAUSTED', 9: 'FAILED_PRECONDITION', 10: 'ABORTED', 11: 'OUT_OF_RANGE', 12: 'UNIMPLEMENTED', 13: 'INTERNAL', 14: 'UNAVAILABLE', 15: 'DATA_LOSS', 16: 'UNAUTHENTICATED' };
      const reasons = [];
      const collectReasons = value => {
        if (typeof value === 'string') {
          if (/^(?:PUBLIC_ERROR_[A-Z0-9_]+|[A-Z][A-Z0-9_]{2,150})$/.test(value)) reasons.push(value);
        } else if (Array.isArray(value)) {
          for (const item of value) collectReasons(item);
        } else if (value && typeof value === 'object') {
          for (const item of Object.values(value)) collectReasons(item);
        }
      };
      collectReasons(flag);
      collectReasons(error);
      const rpcIds = [...new Set(rows.map(value => Array.isArray(value) ? String(value[1] || value[0] || '') : '').filter(Boolean))];
      const details = [
        reasons.length ? `reason=${[...new Set(reasons)].slice(0, 3).join(',')}` : null,
        code != null ? `code=${code}${names[code] ? ` (${names[code]})` : ''}` : null,
        error?.[5] ? `http=${error[5]}` : null,
        row ? `payload=${row[2] === null ? 'null' : Array.isArray(row[2]) ? 'array' : typeof row[2]}` : `rpc-row=missing; received=${rpcIds.slice(0, 5).join(',') || 'no recognized rows'}`
      ].filter(Boolean).join('; ');
      const failure = new Error(`Flow RPC ${rpcId} rejected the request: ${reasons[0] || names[code] || 'NO_PAYLOAD'} (${details || 'no server diagnostic fields'})`);
      failure.code = rpcId === 'ogiZ0b' ? 'FLOW_GENERATION_REJECTED'
        : rpcId === 'maseQ' && Number(code) === 3 ? 'FLOW_UPLOAD_INVALID_ARGUMENT'
        : code === 16 ? 'FLOW_AUTH_REQUIRED' : 'FLOW_RPC_REJECTED';
      throw failure;
    }
    try { return JSON.parse(row[2]); }
    catch {
      const failure = new Error(`Flow RPC ${rpcId} returned malformed JSON in its payload (payload length ${row[2].length}).`);
      failure.code = 'FLOW_GENERATION_REJECTED';
      throw failure;
    }
  }
  function parseGenerationResponse(text, rpcId = 'ogiZ0b') {
    const data = parseRpcPayload(text, rpcId);
    const media = data?.[0]?.[0];
    const mediaId = media?.[0];
    const fifeUrl = media?.[6]?.[0]?.[13];
    if (typeof mediaId !== 'string' || !mediaId || typeof fifeUrl !== 'string' || !/^https:\/\//.test(fifeUrl)) {
      const shape = Array.isArray(data) ? `array(${data.length})` : data === null ? 'null' : typeof data;
      const failure = new Error(`Flow generation returned no usable image (payload shape ${shape}; first item ${Array.isArray(data) ? Array.isArray(data[0]) ? `array(${data[0].length})` : typeof data[0] : 'n/a'}).`);
      failure.code = 'FLOW_GENERATION_REJECTED';
      throw failure;
    }
    return { mediaId, fifeUrl };
  }
  function summarizeHttpFailure(text) {
    const body = String(text || '');
    const reasons = [...new Set(body.match(/PUBLIC_ERROR_[A-Z0-9_]+|(?:PERMISSION_DENIED|RESOURCE_EXHAUSTED|UNAUTHENTICATED|NOT_FOUND|INVALID_ARGUMENT|FAILED_PRECONDITION|INTERNAL|UNAVAILABLE)/g) || [])];
    if (reasons.length) return `server_reason=${reasons.slice(0, 3).join(',')}`;
    const kind = /^\s*</.test(body) ? 'HTML' : /^\s*[\[{]/.test(body) ? 'JSON/RPC' : 'text';
    return `response_body=${kind} (${body.length} chars; content omitted)`;
  }
  const api = {prepareUploadImage, buildUploadRequest, buildGenerationRequest, parseUploadResponse, parseGenerationResponse, parseRpcPayload, buildProjectCreateRequest, parseProjectCreateResponse, summarizeHttpFailure};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BigBombFlowRpc = api;
})(globalThis);
