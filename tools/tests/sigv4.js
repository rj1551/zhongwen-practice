// R2 / S3 request signing (Signature V4), browser WebCrypto. Shared with the app (copied verbatim into index.html).
const SIG_ENC = new TextEncoder();
const sigHex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
async function sigHmac(key, msg) { const k = await crypto.subtle.importKey("raw", typeof key === "string" ? SIG_ENC.encode(key) : key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return new Uint8Array(await crypto.subtle.sign("HMAC", k, SIG_ENC.encode(msg))); }
async function sigSha(s) { return sigHex(await crypto.subtle.digest("SHA-256", typeof s === "string" ? SIG_ENC.encode(s) : s)); }
const rfc3986 = s => encodeURIComponent(s).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase());
async function sigv4({ method, url, headers = {}, payloadHash = "UNSIGNED-PAYLOAD", akid, secret, region = "auto", service = "s3", date = new Date() }) {
  const u = new URL(url);
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, ""), day = amzDate.slice(0, 8);
  const h = {}; for (const k in headers) h[k.toLowerCase()] = String(headers[k]).trim().replace(/\s+/g, " ");
  Object.assign(h, { host: u.host, "x-amz-date": amzDate, "x-amz-content-sha256": payloadHash });
  const names = Object.keys(h).sort(), signed = names.join(";");
  const path = u.pathname.split("/").map(p => rfc3986(decodeURIComponent(p))).join("/");
  const q = [...u.searchParams.entries()].map(([k, v]) => [rfc3986(k), rfc3986(v)]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0).map(([k, v]) => k + "=" + v).join("&");
  const creq = [method, path, q, names.map(n => n + ":" + h[n] + "\n").join(""), signed, payloadHash].join("\n");
  const scope = `${day}/${region}/${service}/aws4_request`;
  const sts = ["AWS4-HMAC-SHA256", amzDate, scope, await sigSha(creq)].join("\n");
  let k = await sigHmac("AWS4" + secret, day); k = await sigHmac(k, region); k = await sigHmac(k, service); k = await sigHmac(k, "aws4_request");
  const out = {}; for (const n of names) if (n !== "host") out[n] = h[n];
  out.authorization = `AWS4-HMAC-SHA256 Credential=${akid}/${scope}, SignedHeaders=${signed}, Signature=${sigHex(await sigHmac(k, sts))}`;
  return out;
}
if (typeof module !== "undefined") module.exports = { sigv4 };
