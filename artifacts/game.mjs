// node_modules/@netlify/runtime-utils/dist/main.js
var getString = (input) => typeof input === "string" ? input : JSON.stringify(input);
var base64Decode = globalThis.Buffer ? (input) => Buffer.from(input, "base64").toString() : (input) => atob(input);
var base64Encode = globalThis.Buffer ? (input) => Buffer.from(getString(input)).toString("base64") : (input) => btoa(getString(input));
var getEnvironment = () => {
  const { Deno, Netlify, process } = globalThis;
  return Netlify?.env ?? Deno?.env ?? {
    delete: (key) => delete process?.env[key],
    get: (key) => process?.env[key],
    has: (key) => Boolean(process?.env[key]),
    set: (key, value) => {
      if (process?.env) {
        process.env[key] = value;
      }
    },
    toObject: () => process?.env ?? {}
  };
};

// node_modules/@netlify/otel/dist/main.js
var GET_TRACER = "__netlify__getTracer";
var getTracer = (name, version) => {
  return globalThis[GET_TRACER]?.(name, version);
};
function withActiveSpan(tracer, name, optionsOrFn, contextOrFn, fn) {
  const func = typeof contextOrFn === "function" ? contextOrFn : typeof optionsOrFn === "function" ? optionsOrFn : fn;
  if (!func) {
    throw new Error("function to execute with active span is missing");
  }
  if (!tracer) {
    return func();
  }
  return tracer.withActiveSpan(name, optionsOrFn, contextOrFn, func);
}

// node_modules/@netlify/blobs/dist/chunk-SQCJ2S3G.js
var getEnvironmentContext = () => {
  const context = globalThis.netlifyBlobsContext || getEnvironment().get("NETLIFY_BLOBS_CONTEXT");
  if (typeof context !== "string" || !context) {
    return {};
  }
  const data = base64Decode(context);
  try {
    return JSON.parse(data);
  } catch {
  }
  return {};
};
var MissingBlobsEnvironmentError = class extends Error {
  constructor(requiredProperties) {
    super(
      `The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: ${requiredProperties.join(
        ", "
      )}`
    );
    this.name = "MissingBlobsEnvironmentError";
  }
};
var BASE64_PREFIX = "b64;";
var METADATA_HEADER_INTERNAL = "x-amz-meta-user";
var METADATA_HEADER_EXTERNAL = "netlify-blobs-metadata";
var METADATA_MAX_SIZE = 2 * 1024;
var encodeMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }
  const encodedObject = base64Encode(JSON.stringify(metadata));
  const payload = `b64;${encodedObject}`;
  if (METADATA_HEADER_EXTERNAL.length + payload.length > METADATA_MAX_SIZE) {
    throw new Error("Metadata object exceeds the maximum size");
  }
  return payload;
};
var decodeMetadata = (header) => {
  if (!header?.startsWith(BASE64_PREFIX)) {
    return {};
  }
  const encodedData = header.slice(BASE64_PREFIX.length);
  const decodedData = base64Decode(encodedData);
  const metadata = JSON.parse(decodedData);
  return metadata;
};
var getMetadataFromResponse = (response2) => {
  if (!response2.headers) {
    return {};
  }
  const value = response2.headers.get(METADATA_HEADER_EXTERNAL) || response2.headers.get(METADATA_HEADER_INTERNAL);
  try {
    return decodeMetadata(value);
  } catch {
    throw new Error(
      "An internal error occurred while trying to retrieve the metadata for an entry. Please try updating to the latest version of the Netlify Blobs client."
    );
  }
};
var NF_ERROR = "x-nf-error";
var NF_REQUEST_ID = "x-nf-request-id";
var DEPLOY_STORE_PREFIX = "deploy:";
var SITE_STORE_PREFIX = "site:";
var isDeniedWrite = (res, { method, storeName }) => (res.status === 401 || res.status === 403) && (method === "put" || method === "delete") && storeName !== void 0 && !storeName.startsWith(DEPLOY_STORE_PREFIX);
var blobsErrorMessage = (res, context, responseBody) => {
  let details = res.headers.get(NF_ERROR) || `${res.status} status code`;
  if (res.headers.has(NF_REQUEST_ID)) {
    details += `, ID: ${res.headers.get(NF_REQUEST_ID)}`;
  }
  if (isDeniedWrite(res, context)) {
    const storeName = context.storeName?.startsWith(SITE_STORE_PREFIX) ? context.storeName.slice(SITE_STORE_PREFIX.length) : context.storeName;
    const summary = `Netlify Blobs could not write to store '${storeName}' (${details}).`;
    if (context.edgeAccess) {
      return summary;
    }
    return `${summary} Builds and build plugins can only write to deploy-specific stores: use 'getDeployStore' instead of 'getStore', or pass a 'token' with write access to the store. If this code is not running in a build, check that the token and site ID are valid. See https://docs.netlify.com/build/data-and-storage/netlify-blobs/#deploy-specific-stores`;
  }
  let message = `Netlify Blobs has generated an internal error (${details})`;
  if (!res.headers.get(NF_ERROR) && responseBody) {
    message += `: ${responseBody}`;
  }
  return message;
};
var BlobsInternalError = class extends Error {
  constructor(res, context = {}, responseBody) {
    super(blobsErrorMessage(res, context, responseBody));
    this.name = "BlobsInternalError";
    this.status = res.status;
    this.responseBody = responseBody;
  }
};
var createBlobsInternalError = async (res, context = {}) => {
  const responseBody = await res.clone().text().catch(() => void 0);
  return new BlobsInternalError(res, context, responseBody);
};
var discardBody = async (res) => {
  await res.body?.cancel().catch(() => {
  });
};
var collectIterator = async (iterator) => {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
};
function withSpan(span, name, fn) {
  if (span) return fn(span);
  return withActiveSpan(getTracer(), name, (span2) => {
    return fn(span2);
  });
}
var BlobsConsistencyError = class extends Error {
  constructor() {
    super(
      `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
    );
    this.name = "BlobsConsistencyError";
  }
};
var REGION_AUTO = "auto";
var regions = {
  "us-east-1": true,
  "us-east-2": true,
  "eu-central-1": true,
  "ap-southeast-1": true,
  "ap-southeast-2": true
};
var isValidRegion = (input) => Object.keys(regions).includes(input);
var InvalidBlobsRegionError = class extends Error {
  constructor(region) {
    super(
      `${region} is not a supported Netlify Blobs region. Supported values are: ${Object.keys(regions).join(", ")}.`
    );
    this.name = "InvalidBlobsRegionError";
  }
};
var DEFAULT_RETRY_DELAY = getEnvironment().get("NODE_ENV") === "test" ? 1 : 5e3;
var MIN_RETRY_DELAY = 1e3;
var MAX_RETRY = 5;
var RATE_LIMIT_HEADER = "X-RateLimit-Reset";
var fetchAndRetry = async (fetch, url, options, attemptsLeft = MAX_RETRY, getRetryUrl) => {
  try {
    const res = await fetch(url, options);
    const isRetryable = res.status === 429 || res.status >= 500 || getRetryUrl !== void 0 && res.status === 403;
    if (attemptsLeft > 0 && isRetryable) {
      await discardBody(res);
      const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
      await sleep(delay);
      const retryUrl = getRetryUrl ? await getRetryUrl() : url;
      return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
    }
    return res;
  } catch (error) {
    if (attemptsLeft === 0) {
      throw error;
    }
    const delay = getDelay();
    await sleep(delay);
    const retryUrl = getRetryUrl ? await getRetryUrl() : url;
    return fetchAndRetry(fetch, retryUrl, options, attemptsLeft - 1, getRetryUrl);
  }
};
var getDelay = (rateLimitReset) => {
  if (!rateLimitReset) {
    return DEFAULT_RETRY_DELAY;
  }
  return Math.max(Number(rateLimitReset) * 1e3 - Date.now(), MIN_RETRY_DELAY);
};
var sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var SIGNED_URL_ACCEPT_HEADER = "application/json;type=signed-url";
var Client = class {
  /**
   * Whether requests reach Blobs through the edge rather than the API. Only
   * runtime environments are given an edge URL.
   */
  get edgeAccess() {
    return this.edgeURL !== void 0;
  }
  constructor({ apiURL, consistency, edgeURL, fetch, region, siteID, token, uncachedEdgeURL }) {
    this.apiURL = apiURL;
    this.consistency = consistency ?? "eventual";
    this.edgeURL = edgeURL;
    this.fetch = fetch ?? globalThis.fetch;
    this.region = region;
    this.siteID = siteID;
    this.token = token;
    this.uncachedEdgeURL = uncachedEdgeURL;
    if (!this.fetch) {
      throw new Error(
        "Netlify Blobs could not find a `fetch` client in the global scope. You can either update your runtime to a version that includes `fetch` (like Node.js 18.0.0 or above), or you can supply your own implementation using the `fetch` property."
      );
    }
  }
  async getFinalRequest({
    consistency: opConsistency,
    key,
    metadata,
    method,
    parameters = {},
    storeName
  }) {
    const encodedMetadata = encodeMetadata(metadata);
    const consistency = opConsistency ?? this.consistency;
    let urlPath = `/${this.siteID}`;
    if (storeName) {
      urlPath += `/${storeName}`;
    }
    if (key) {
      urlPath += `/${key}`;
    }
    if (this.edgeURL) {
      if (consistency === "strong" && !this.uncachedEdgeURL) {
        throw new BlobsConsistencyError();
      }
      const headers2 = {
        authorization: `Bearer ${this.token}`
      };
      if (encodedMetadata) {
        headers2[METADATA_HEADER_INTERNAL] = encodedMetadata;
      }
      if (this.region) {
        urlPath = `/region:${this.region}${urlPath}`;
      }
      const url2 = new URL(urlPath, consistency === "strong" ? this.uncachedEdgeURL : this.edgeURL);
      for (const key2 in parameters) {
        url2.searchParams.set(key2, parameters[key2]);
      }
      return {
        headers: headers2,
        url: url2.toString()
      };
    }
    const apiHeaders = { authorization: `Bearer ${this.token}` };
    const url = new URL(`/api/v1/blobs${urlPath}`, this.apiURL ?? "https://api.netlify.com");
    for (const key2 in parameters) {
      url.searchParams.set(key2, parameters[key2]);
    }
    if (this.region) {
      url.searchParams.set("region", this.region);
    }
    if (storeName === void 0 || key === void 0) {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    if (encodedMetadata) {
      apiHeaders[METADATA_HEADER_EXTERNAL] = encodedMetadata;
    }
    if (method === "head" || method === "delete") {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    const res = await this.fetch(url.toString(), {
      headers: { ...apiHeaders, accept: SIGNED_URL_ACCEPT_HEADER },
      method
    });
    if (res.status !== 200) {
      throw await createBlobsInternalError(res, { edgeAccess: this.edgeAccess, method, storeName });
    }
    const { url: signedURL } = await res.json();
    const userHeaders = encodedMetadata ? { [METADATA_HEADER_INTERNAL]: encodedMetadata } : void 0;
    return {
      headers: userHeaders,
      url: signedURL
    };
  }
  async makeRequest({
    body,
    conditions = {},
    consistency,
    headers: extraHeaders,
    key,
    metadata,
    method,
    parameters,
    storeName
  }) {
    const { headers: baseHeaders = {}, url } = await this.getFinalRequest({
      consistency,
      key,
      metadata,
      method,
      parameters,
      storeName
    });
    const headers2 = {
      ...baseHeaders,
      ...extraHeaders
    };
    if (method === "put") {
      headers2["cache-control"] = "max-age=0, stale-while-revalidate=60";
    }
    if ("onlyIfMatch" in conditions && conditions.onlyIfMatch) {
      headers2["if-match"] = conditions.onlyIfMatch;
    } else if ("onlyIfNew" in conditions && conditions.onlyIfNew) {
      headers2["if-none-match"] = "*";
    }
    const options = {
      body,
      headers: headers2,
      method
    };
    if (body instanceof ReadableStream) {
      options.duplex = "half";
    }
    const usesSignedUrl = !this.edgeURL && key !== void 0 && storeName !== void 0 && method !== "head" && method !== "delete";
    let getRetryUrl;
    if (usesSignedUrl) {
      getRetryUrl = async () => {
        const finalRequest = await this.getFinalRequest({ consistency, key, metadata, method, parameters, storeName });
        return finalRequest.url;
      };
    }
    return fetchAndRetry(this.fetch, url, options, void 0, getRetryUrl);
  }
};
var getClientOptions = (options, contextOverride) => {
  const context = contextOverride ?? getEnvironmentContext();
  const siteID = context.siteID ?? options.siteID;
  const token = context.token ?? options.token;
  if (!siteID || !token) {
    throw new MissingBlobsEnvironmentError(["siteID", "token"]);
  }
  if (options.region !== void 0 && !isValidRegion(options.region)) {
    throw new InvalidBlobsRegionError(options.region);
  }
  const clientOptions = {
    apiURL: context.apiURL ?? options.apiURL,
    consistency: options.consistency,
    edgeURL: context.edgeURL ?? options.edgeURL,
    fetch: options.fetch,
    region: options.region,
    siteID,
    token,
    uncachedEdgeURL: context.uncachedEdgeURL ?? options.uncachedEdgeURL
  };
  return clientOptions;
};

// node_modules/@netlify/blobs/dist/main.js
var LEGACY_STORE_INTERNAL_PREFIX = "netlify-internal/legacy-namespace/";
var STATUS_OK = 200;
var STATUS_PRE_CONDITION_FAILED = 412;
var STATUS_CONFLICT = 409;
var Store = class _Store {
  constructor(options) {
    this.client = options.client;
    if ("deployID" in options) {
      _Store.validateDeployID(options.deployID);
      let name = DEPLOY_STORE_PREFIX + options.deployID;
      if (options.name) {
        name += `:${options.name}`;
      }
      this.name = name;
    } else if (options.name.startsWith(LEGACY_STORE_INTERNAL_PREFIX)) {
      const storeName = options.name.slice(LEGACY_STORE_INTERNAL_PREFIX.length);
      _Store.validateStoreName(storeName);
      this.name = storeName;
    } else {
      _Store.validateStoreName(options.name);
      this.name = SITE_STORE_PREFIX + options.name;
    }
  }
  async delete(key) {
    const res = await this.client.makeRequest({ key, method: "delete", storeName: this.name });
    await discardBody(res);
    if (![200, 204, 404].includes(res.status)) {
      throw new BlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "delete",
        storeName: this.name
      });
    }
  }
  async deleteAll() {
    let totalDeletedBlobs = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await this.client.makeRequest({ method: "delete", storeName: this.name });
      if (res.status !== 200) {
        await discardBody(res);
        throw new BlobsInternalError(res, {
          edgeAccess: this.client.edgeAccess,
          method: "delete",
          storeName: this.name
        });
      }
      const data = await res.json();
      if (typeof data.blobs_deleted !== "number") {
        throw new BlobsInternalError(res);
      }
      totalDeletedBlobs += data.blobs_deleted;
      hasMore = typeof data.has_more === "boolean" && data.has_more;
    }
    return {
      deletedBlobs: totalDeletedBlobs
    };
  }
  async get(key, options) {
    return withSpan(options?.span, "blobs.get", async (span) => {
      const { consistency, type } = options ?? {};
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.type": type,
        "blobs.method": "GET",
        "blobs.consistency": consistency
      });
      const res = await this.client.makeRequest({
        consistency,
        key,
        method: "get",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        await discardBody(res);
        return null;
      }
      if (res.status !== 200) {
        await discardBody(res);
        throw new BlobsInternalError(res);
      }
      if (type === void 0 || type === "text") {
        return res.text();
      }
      if (type === "arrayBuffer") {
        return res.arrayBuffer();
      }
      if (type === "blob") {
        return res.blob();
      }
      if (type === "json") {
        return res.json();
      }
      if (type === "stream") {
        return res.body;
      }
      await discardBody(res);
      throw new BlobsInternalError(res);
    });
  }
  async getMetadata(key, options = {}) {
    return withSpan(options?.span, "blobs.getMetadata", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "HEAD",
        "blobs.consistency": options.consistency
      });
      const res = await this.client.makeRequest({
        consistency: options.consistency,
        key,
        method: "head",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const etag = res?.headers.get("etag") ?? void 0;
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag,
        metadata
      };
      return result;
    });
  }
  async getWithMetadata(key, options) {
    return withSpan(options?.span, "blobs.getWithMetadata", async (span) => {
      const { consistency, etag: requestETag, type } = options ?? {};
      const headers2 = requestETag ? { "if-none-match": requestETag } : void 0;
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "GET",
        "blobs.consistency": options?.consistency,
        "blobs.type": type,
        "blobs.request.etag": requestETag
      });
      const res = await this.client.makeRequest({
        consistency,
        headers: headers2,
        key,
        method: "get",
        storeName: this.name
      });
      const responseETag = res?.headers.get("etag") ?? void 0;
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.etag": responseETag,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        await discardBody(res);
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        await discardBody(res);
        throw new BlobsInternalError(res);
      }
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag: responseETag,
        metadata
      };
      if (res.status === 304 && requestETag) {
        return { data: null, ...result };
      }
      if (type === void 0 || type === "text") {
        return { data: await res.text(), ...result };
      }
      if (type === "arrayBuffer") {
        return { data: await res.arrayBuffer(), ...result };
      }
      if (type === "blob") {
        return { data: await res.blob(), ...result };
      }
      if (type === "json") {
        return { data: await res.json(), ...result };
      }
      if (type === "stream") {
        return { data: res.body, ...result };
      }
      await discardBody(res);
      throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
    });
  }
  list(options = {}) {
    return withSpan(options.span, "blobs.list", (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.method": "GET",
        "blobs.list.paginate": options.paginate ?? false
      });
      const iterator = this.getListIterator(options);
      if (options.paginate) {
        return iterator;
      }
      return collectIterator(iterator).then(
        (items) => items.reduce(
          (acc, item) => ({
            blobs: [...acc.blobs, ...item.blobs],
            directories: [...acc.directories, ...item.directories]
          }),
          { blobs: [], directories: [] }
        )
      );
    });
  }
  async set(key, data, options = {}) {
    return withSpan(options.span, "blobs.set", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.size": typeof data == "string" ? data.length : data instanceof Blob ? data.size : data.byteLength,
        "blobs.data.type": typeof data == "string" ? "string" : data instanceof Blob ? "blob" : "arrayBuffer",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const res = await this.client.makeRequest({
        conditions,
        body: data,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        if (res.status === STATUS_PRE_CONDITION_FAILED || res.status === STATUS_CONFLICT) {
          await discardBody(res);
          return { modified: false };
        }
        if (res.ok) {
          await discardBody(res);
          return { etag, modified: true };
        }
        throw await createBlobsInternalError(res, {
          edgeAccess: this.client.edgeAccess,
          method: "put",
          storeName: this.name
        });
      }
      if (res.status === STATUS_OK) {
        await discardBody(res);
        return {
          etag,
          modified: true
        };
      }
      throw await createBlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
  }
  async setJSON(key, data, options = {}) {
    return withSpan(options.span, "blobs.setJSON", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.type": "json",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const payload = JSON.stringify(data);
      const headers2 = {
        "content-type": "application/json"
      };
      const res = await this.client.makeRequest({
        conditions,
        body: payload,
        headers: headers2,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        if (res.status === STATUS_PRE_CONDITION_FAILED || res.status === STATUS_CONFLICT) {
          await discardBody(res);
          return { modified: false };
        }
        if (res.ok) {
          await discardBody(res);
          return { etag, modified: true };
        }
        throw await createBlobsInternalError(res, {
          edgeAccess: this.client.edgeAccess,
          method: "put",
          storeName: this.name
        });
      }
      if (res.status === STATUS_OK) {
        await discardBody(res);
        return {
          etag,
          modified: true
        };
      }
      throw await createBlobsInternalError(res, {
        edgeAccess: this.client.edgeAccess,
        method: "put",
        storeName: this.name
      });
    });
  }
  static formatListResultBlob(result) {
    if (!result.key) {
      return null;
    }
    return {
      etag: result.etag,
      key: result.key
    };
  }
  static getConditions(options) {
    if ("onlyIfMatch" in options && "onlyIfNew" in options) {
      throw new Error(
        `The 'onlyIfMatch' and 'onlyIfNew' options are mutually exclusive. Using 'onlyIfMatch' will make the write succeed only if there is an entry for the key with the given content, while 'onlyIfNew' will make the write succeed only if there is no entry for the key.`
      );
    }
    if ("onlyIfMatch" in options && options.onlyIfMatch) {
      if (typeof options.onlyIfMatch !== "string") {
        throw new Error(`The 'onlyIfMatch' property expects a string representing an ETag.`);
      }
      return {
        onlyIfMatch: options.onlyIfMatch
      };
    }
    if ("onlyIfNew" in options && options.onlyIfNew) {
      if (typeof options.onlyIfNew !== "boolean") {
        throw new Error(
          `The 'onlyIfNew' property expects a boolean indicating whether the write should fail if an entry for the key already exists.`
        );
      }
      return {
        onlyIfNew: true
      };
    }
  }
  static validateKey(key) {
    if (key === "") {
      throw new Error("Blob key must not be empty.");
    }
    if (key.startsWith("/") || key.startsWith("%2F")) {
      throw new Error("Blob key must not start with forward slash (/).");
    }
    if (new TextEncoder().encode(key).length > 600) {
      throw new Error(
        "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long."
      );
    }
  }
  static validateDeployID(deployID) {
    if (!/^\w{1,24}$/.test(deployID)) {
      throw new Error(`'${deployID}' is not a valid Netlify deploy ID.`);
    }
  }
  static validateStoreName(name) {
    if (name.includes("/") || name.includes("%2F")) {
      throw new Error("Store name must not contain forward slashes (/).");
    }
    if (new TextEncoder().encode(name).length > 64) {
      throw new Error(
        "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long."
      );
    }
  }
  getListIterator(options) {
    const { client, name: storeName } = this;
    const parameters = {};
    if (options?.prefix) {
      parameters.prefix = options.prefix;
    }
    if (options?.directories) {
      parameters.directories = "true";
    }
    return {
      [Symbol.asyncIterator]() {
        let currentCursor = null;
        let done = false;
        return {
          async next() {
            return withSpan(options?.span, "blobs.list.next", async (span) => {
              span?.setAttributes({
                "blobs.store": storeName,
                "blobs.method": "GET",
                "blobs.list.paginate": options?.paginate ?? false,
                "blobs.list.done": done,
                "blobs.list.cursor": currentCursor ?? void 0
              });
              if (done) {
                return { done: true, value: void 0 };
              }
              const nextParameters = { ...parameters };
              if (currentCursor !== null) {
                nextParameters.cursor = currentCursor;
              }
              const res = await client.makeRequest({
                method: "get",
                parameters: nextParameters,
                storeName
              });
              span?.setAttributes({
                "blobs.response.status": res.status
              });
              let blobs = [];
              let directories = [];
              if (![200, 204, 404].includes(res.status)) {
                await discardBody(res);
                throw new BlobsInternalError(res);
              }
              if (res.status === 404) {
                await discardBody(res);
                done = true;
              } else {
                const page = await res.json();
                if (page.next_cursor) {
                  currentCursor = page.next_cursor;
                } else {
                  done = true;
                }
                blobs = (page.blobs ?? []).map(_Store.formatListResultBlob).filter(Boolean);
                directories = page.directories ?? [];
              }
              return {
                done: false,
                value: {
                  blobs,
                  directories
                }
              };
            });
          }
        };
      }
    };
  }
};
var getDeployStoreRegion = (clientOptions, context) => {
  if (clientOptions.region) {
    return clientOptions.region;
  }
  if (clientOptions.edgeURL || clientOptions.uncachedEdgeURL) {
    if (!context.primaryRegion) {
      throw new Error(
        "When accessing a deploy store, the Netlify Blobs client needs to be configured with a region, and one was not found in the environment. To manually set the region, set the `region` property in the store options. If you are using the Netlify CLI, you may have an outdated version; run `npm install -g netlify-cli@latest` to update and try again."
      );
    }
    return context.primaryRegion;
  }
  return REGION_AUTO;
};
var getStore = (input, options) => {
  if (typeof input === "string") {
    const contextOverride = options?.siteID && options?.token ? { siteID: options?.siteID, token: options?.token } : void 0;
    const clientOptions = getClientOptions(options ?? {}, contextOverride);
    const client = new Client(clientOptions);
    return new Store({ client, name: input });
  }
  if (typeof input?.name === "string") {
    const { name } = input;
    const contextOverride = input?.siteID && input?.token ? { siteID: input?.siteID, token: input?.token } : void 0;
    const clientOptions = getClientOptions(input, contextOverride);
    if (!name) {
      throw new MissingBlobsEnvironmentError(["name"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, name });
  }
  if (typeof input?.deployID === "string") {
    const context = getEnvironmentContext();
    const clientOptions = getClientOptions(input, context);
    const { deployID } = input;
    if (!deployID) {
      throw new MissingBlobsEnvironmentError(["deployID"]);
    }
    clientOptions.region = getDeployStoreRegion(clientOptions, context);
    const client = new Client(clientOptions);
    return new Store({ client, deployID });
  }
  throw new Error(
    "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
  );
};

// lib/blob-repository.mjs
function createBlobRepository(store = getStore({ name: "bluff-rumble-rooms", consistency: "strong" })) {
  return {
    async read(code) {
      const item = await store.getWithMetadata(`room:${code}`, { type: "json", consistency: "strong" });
      return item ? { room: item.data, etag: item.etag } : null;
    },
    async write(code, room, etag) {
      const result = await store.setJSON(`room:${code}`, room, etag === null ? { onlyIfNew: true } : { onlyIfMatch: etag });
      return result.modified;
    }
  };
}

// lib/function-service.mjs
import { createHash, randomUUID } from "node:crypto";

// engine.mjs
import { randomBytes, randomInt } from "node:crypto";

// questions.json
var questions_default = [
  {
    id: "0f34375ca1f34433",
    category: "funny",
    question: "Which Australian animal leaves famously cube-shaped droppings?",
    truth: "Wombat",
    aliases: [
      "Wombats",
      "A wombat"
    ],
    decoys: [
      "Koala",
      "Kangaroo",
      "Wallaby",
      "Echidna"
    ]
  },
  {
    id: "b2db03971a8fb2c4",
    category: "funny",
    question: "How many hearts does an octopus have?",
    truth: "Three",
    aliases: [
      "3",
      "Three hearts"
    ],
    decoys: [
      "One",
      "Two",
      "Four",
      "Eight"
    ]
  },
  {
    id: "ed56957b567f9f37",
    category: "funny",
    question: "Which bird gets its pink feathers from pigments in its food?",
    truth: "Flamingo",
    aliases: [
      "Flamingos",
      "A flamingo"
    ],
    decoys: [
      "Swan",
      "Pelican",
      "Heron",
      "Stork"
    ]
  },
  {
    id: "52c6b44e7925ebb8",
    category: "funny",
    question: "Which duck-billed mammal lays eggs?",
    truth: "Platypus",
    aliases: [
      "A platypus"
    ],
    decoys: [
      "Otter",
      "Beaver",
      "Capybara",
      "Muskrat"
    ]
  },
  {
    id: "5c6b80d58054e208",
    category: "funny",
    question: "Which spiny mammal also lays eggs?",
    truth: "Echidna",
    aliases: [
      "An echidna",
      "Spiny anteater"
    ],
    decoys: [
      "Hedgehog",
      "Porcupine",
      "Armadillo",
      "Pangolin"
    ]
  },
  {
    id: "52f0d4ef1f286c9a",
    category: "funny",
    question: "Which animal's fingerprints can look remarkably like human fingerprints?",
    truth: "Koala",
    aliases: [
      "Koalas",
      "A koala"
    ],
    decoys: [
      "Kangaroo",
      "Wombat",
      "Sloth",
      "Raccoon"
    ]
  },
  {
    id: "15a08c7edc66ed82",
    category: "funny",
    question: "Which sea creature's males carry developing babies in a brood pouch?",
    truth: "Seahorse",
    aliases: [
      "Seahorses",
      "A seahorse"
    ],
    decoys: [
      "Clownfish",
      "Swordfish",
      "Angelfish",
      "Stingray"
    ]
  },
  {
    id: "2a5878fbdec1479a",
    category: "funny",
    question: "Which marine mammal uses rocks as tools to crack open shellfish?",
    truth: "Sea otter",
    aliases: [
      "Sea otters",
      "Otter"
    ],
    decoys: [
      "Dolphin",
      "Seal",
      "Walrus",
      "Manatee"
    ]
  },
  {
    id: "27deabe133972e30",
    category: "funny",
    question: "What colour is an octopus's oxygen-rich blood?",
    truth: "Blue",
    aliases: [],
    decoys: [
      "Red",
      "Green",
      "Yellow",
      "Purple"
    ]
  },
  {
    id: "43773d2e8cebb8ea",
    category: "funny",
    question: "Which animal has a long neck but usually just seven neck vertebrae, like humans?",
    truth: "Giraffe",
    aliases: [
      "Giraffes",
      "A giraffe"
    ],
    decoys: [
      "Ostrich",
      "Flamingo",
      "Swan",
      "Emu"
    ]
  },
  {
    id: "7abf99f43d6be8c2",
    category: "funny",
    question: "What colour is a polar bear's skin beneath its fur?",
    truth: "Black",
    aliases: [],
    decoys: [
      "White",
      "Pink",
      "Grey",
      "Brown"
    ]
  },
  {
    id: "92ca6e8912108a79",
    category: "funny",
    question: "Which bird's eyes are so large it cannot rotate them in their sockets?",
    truth: "Owl",
    aliases: [
      "Owls",
      "An owl"
    ],
    decoys: [
      "Pigeon",
      "Crow",
      "Duck",
      "Chicken"
    ]
  },
  {
    id: "2fd666d1c18ee41b",
    category: "funny",
    question: "Which mammal takes flight using wings made of skin stretched over long fingers?",
    truth: "Bat",
    aliases: [
      "Bats",
      "A bat"
    ],
    decoys: [
      "Flying squirrel",
      "Sugar glider",
      "Colugo",
      "Flying fox fish"
    ]
  },
  {
    id: "a58e5f5bf1ba672c",
    category: "funny",
    question: "Which animal eats bamboo for most of its diet despite belonging to the order Carnivora?",
    truth: "Giant panda",
    aliases: [
      "Panda",
      "A giant panda"
    ],
    decoys: [
      "Red fox",
      "Badger",
      "Raccoon",
      "Brown bear"
    ]
  },
  {
    id: "51f8b86689152676",
    category: "funny",
    question: "Which shark is the largest fish, despite eating tiny plankton?",
    truth: "Whale shark",
    aliases: [
      "A whale shark"
    ],
    decoys: [
      "Great white shark",
      "Hammerhead shark",
      "Tiger shark",
      "Bull shark"
    ]
  },
  {
    id: "da610dc2044a56d5",
    category: "funny",
    question: "Which flightless bird lays the largest eggs of any living bird?",
    truth: "Ostrich",
    aliases: [
      "Ostriches",
      "An ostrich"
    ],
    decoys: [
      "Emu",
      "Cassowary",
      "Penguin",
      "Rhea"
    ]
  },
  {
    id: "498f70a118309771",
    category: "funny",
    question: "Which tiny bird can fly backwards as well as hover?",
    truth: "Hummingbird",
    aliases: [
      "Hummingbirds",
      "A hummingbird"
    ],
    decoys: [
      "Sparrow",
      "Robin",
      "Finch",
      "Swallow"
    ]
  },
  {
    id: "0eb933040197a1aa",
    category: "funny",
    question: "How many humps does a Bactrian camel normally have?",
    truth: "Two",
    aliases: [
      "2",
      "Two humps"
    ],
    decoys: [
      "One",
      "Three",
      "Four",
      "Zero"
    ]
  },
  {
    id: "b2077139b7bdfae1",
    category: "funny",
    question: "Which big cat is famous for roaring but cannot purr continuously like a house cat?",
    truth: "Lion",
    aliases: [
      "Lions",
      "A lion"
    ],
    decoys: [
      "Cheetah",
      "Puma",
      "Lynx",
      "Bobcat"
    ]
  },
  {
    id: "4c391c68359e9e6f",
    category: "funny",
    question: "Which African animal's name means river horse in Greek?",
    truth: "Hippopotamus",
    aliases: [
      "Hippo",
      "A hippopotamus"
    ],
    decoys: [
      "Rhinoceros",
      "Giraffe",
      "Warthog",
      "Okapi"
    ]
  },
  {
    id: "08c880286f6edbd5",
    category: "funny",
    question: "What is a baby kangaroo commonly called?",
    truth: "Joey",
    aliases: [
      "A joey"
    ],
    decoys: [
      "Calf",
      "Kit",
      "Pup",
      "Foal"
    ]
  },
  {
    id: "03ce88cb0389005d",
    category: "funny",
    question: "What is a young frog before metamorphosis called?",
    truth: "Tadpole",
    aliases: [
      "A tadpole",
      "Tadpoles"
    ],
    decoys: [
      "Larva fly",
      "Nymph",
      "Fry",
      "Gosling"
    ]
  },
  {
    id: "60fd83249ca63cae",
    category: "funny",
    question: "What is a baby swan called?",
    truth: "Cygnet",
    aliases: [
      "A cygnet"
    ],
    decoys: [
      "Gosling",
      "Duckling",
      "Poult",
      "Squab"
    ]
  },
  {
    id: "a1d3e7dada1cbf83",
    category: "funny",
    question: "What is a baby pigeon commonly called?",
    truth: "Squab",
    aliases: [
      "A squab"
    ],
    decoys: [
      "Cygnet",
      "Gosling",
      "Poult",
      "Eaglet"
    ]
  },
  {
    id: "000dddd0db4236af",
    category: "funny",
    question: "What is a baby goose called?",
    truth: "Gosling",
    aliases: [
      "A gosling"
    ],
    decoys: [
      "Cygnet",
      "Squab",
      "Poult",
      "Joey"
    ]
  },
  {
    id: "9e9c5e6717a09656",
    category: "funny",
    question: "What is the traditional collective noun in the phrase a ___ of crows?",
    truth: "Murder",
    aliases: [
      "A murder"
    ],
    decoys: [
      "Parliament",
      "Pride",
      "Crash",
      "Tower"
    ]
  },
  {
    id: "cf43cf3dab1fc77e",
    category: "funny",
    question: "What is the traditional collective noun in a ___ of lions?",
    truth: "Pride",
    aliases: [
      "A pride"
    ],
    decoys: [
      "Murder",
      "Parliament",
      "Crash",
      "Tower"
    ]
  },
  {
    id: "5a674be0079d78fb",
    category: "funny",
    question: "What is the traditional collective noun in a ___ of owls?",
    truth: "Parliament",
    aliases: [
      "A parliament"
    ],
    decoys: [
      "Pride",
      "Murder",
      "Gaggle",
      "Pod"
    ]
  },
  {
    id: "faf58bed3c987487",
    category: "funny",
    question: "What is the traditional collective noun in a ___ of geese on the ground?",
    truth: "Gaggle",
    aliases: [
      "A gaggle"
    ],
    decoys: [
      "Pride",
      "Murder",
      "School",
      "Pod"
    ]
  },
  {
    id: "eaea59c48dc52c62",
    category: "funny",
    question: "Which animal's long tusk is actually an elongated tooth, not a horn?",
    truth: "Narwhal",
    aliases: [
      "A narwhal"
    ],
    decoys: [
      "Walrus beetle",
      "Swordfish",
      "Sawfish",
      "Beluga"
    ]
  },
  {
    id: "98ddac02a6261a66",
    category: "funny",
    question: "Which colour-changing reptile has eyes that can move independently?",
    truth: "Chameleon",
    aliases: [
      "A chameleon"
    ],
    decoys: [
      "Iguana",
      "Gecko",
      "Monitor lizard",
      "Komodo dragon"
    ]
  },
  {
    id: "9a33690d4b54efc6",
    category: "funny",
    question: "Which insect tastes with sensory receptors on its feet?",
    truth: "Butterfly",
    aliases: [
      "Butterflies",
      "A butterfly"
    ],
    decoys: [
      "Dragonfly",
      "Grasshopper",
      "Praying mantis",
      "Termite"
    ]
  },
  {
    id: "e222c59ef2c9ed9e",
    category: "funny",
    question: "Which animal is famous for spraying a foul-smelling defensive liquid from its rear?",
    truth: "Skunk",
    aliases: [
      "A skunk"
    ],
    decoys: [
      "Badger",
      "Raccoon",
      "Beaver",
      "Mole"
    ]
  },
  {
    id: "458318a014ad2762",
    category: "funny",
    question: "Which slow mammal often grows algae in its fur?",
    truth: "Sloth",
    aliases: [
      "Sloths",
      "A sloth"
    ],
    decoys: [
      "Koala",
      "Wombat",
      "Panda",
      "Lemur"
    ]
  },
  {
    id: "0a6c72377af3065f",
    category: "funny",
    question: "Which living rodent is the largest and looks like a giant guinea pig?",
    truth: "Capybara",
    aliases: [
      "A capybara"
    ],
    decoys: [
      "Beaver",
      "Marmot",
      "Porcupine",
      "Muskrat"
    ]
  },
  {
    id: "a248aa87c7077ad1",
    category: "funny",
    question: "Which African mammal looks striped like a zebra on its legs but is related to giraffes?",
    truth: "Okapi",
    aliases: [
      "An okapi"
    ],
    decoys: [
      "Kudu",
      "Bongo",
      "Oryx",
      "Nyala"
    ]
  },
  {
    id: "6816c73f4f71ab44",
    category: "funny",
    question: "Which lizard is famous for running short distances across water?",
    truth: "Basilisk lizard",
    aliases: [
      "Basilisk",
      "Jesus Christ lizard"
    ],
    decoys: [
      "Iguana",
      "Chameleon",
      "Komodo dragon",
      "Skink"
    ]
  },
  {
    id: "c945951edca57b88",
    category: "funny",
    question: "Which bird is famous for mimicking chainsaws and camera shutters?",
    truth: "Lyrebird",
    aliases: [
      "A lyrebird",
      "Superb lyrebird"
    ],
    decoys: [
      "Kingfisher",
      "Puffin",
      "Heron",
      "Penguin"
    ]
  },
  {
    id: "fbd95809425d24f6",
    category: "funny",
    question: "Which Australian bird has a call that sounds like human laughter?",
    truth: "Kookaburra",
    aliases: [
      "A kookaburra"
    ],
    decoys: [
      "Cockatoo",
      "Emu",
      "Cassowary",
      "Magpie goose"
    ]
  },
  {
    id: "b214b766f7243de6",
    category: "funny",
    question: "Which penguin species shares its name with formal evening wear?",
    truth: "Chinstrap penguin",
    aliases: [
      "Chinstrap"
    ],
    decoys: [
      "Necktie penguin",
      "Tuxedo penguin",
      "Bowtie penguin",
      "Cummerbund penguin"
    ]
  },
  {
    id: "967a7635a1c8aed3",
    category: "funny",
    question: "Which ocean animal has a mouth shaped like a parrot's beak and eight arms?",
    truth: "Octopus",
    aliases: [
      "An octopus"
    ],
    decoys: [
      "Jellyfish",
      "Sea cucumber",
      "Starfish",
      "Anemone"
    ]
  },
  {
    id: "74c8324906496b33",
    category: "funny",
    question: "Which crustacean can create a loud snapping bubble using its enlarged claw?",
    truth: "Pistol shrimp",
    aliases: [
      "Snapping shrimp",
      "A pistol shrimp"
    ],
    decoys: [
      "Hermit crab",
      "Krill",
      "Barnacle",
      "Horseshoe crab"
    ]
  },
  {
    id: "c0ed87e12eaa6663",
    category: "funny",
    question: "Which shell-less marine animal can eject internal organs as a defence?",
    truth: "Sea cucumber",
    aliases: [
      "A sea cucumber"
    ],
    decoys: [
      "Sea horse",
      "Sea urchin",
      "Sea fan",
      "Sea anemone"
    ]
  },
  {
    id: "13aaf723e0fecee6",
    category: "funny",
    question: "Which fish inflates its body like a spiky balloon when threatened?",
    truth: "Pufferfish",
    aliases: [
      "Puffer fish",
      "Blowfish"
    ],
    decoys: [
      "Angelfish",
      "Swordfish",
      "Tuna",
      "Cod"
    ]
  },
  {
    id: "d2ef427cf277dbf8",
    category: "funny",
    question: "Which fish lives among the stinging tentacles of sea anemones?",
    truth: "Clownfish",
    aliases: [
      "Anemonefish",
      "A clownfish"
    ],
    decoys: [
      "Goldfish",
      "Guppy",
      "Salmon",
      "Trout"
    ]
  },
  {
    id: "dc4cbe9ed2b0a80f",
    category: "funny",
    question: "Which bird famously builds and decorates a display structure to attract a mate?",
    truth: "Bowerbird",
    aliases: [
      "A bowerbird"
    ],
    decoys: [
      "Woodpecker",
      "Kingfisher",
      "Albatross",
      "Pelican"
    ]
  },
  {
    id: "a4527dc00d5c1b75",
    category: "funny",
    question: "Which African bird has long eyelashes and stomps snakes with its legs?",
    truth: "Secretary bird",
    aliases: [
      "Secretarybird",
      "A secretary bird"
    ],
    decoys: [
      "Shoebill",
      "Marabou stork",
      "Hornbill",
      "Vulture"
    ]
  },
  {
    id: "f2e02a013cac8b3d",
    category: "funny",
    question: "Which big-beaked African bird has a name referring to footwear?",
    truth: "Shoebill",
    aliases: [
      "A shoebill"
    ],
    decoys: [
      "Boot heron",
      "Slipper stork",
      "Sandal crane",
      "Clog ibis"
    ]
  },
  {
    id: "eab778a489b16da1",
    category: "funny",
    question: "Which amphibian keeps its feathery external gills as an adult?",
    truth: "Axolotl",
    aliases: [
      "An axolotl"
    ],
    decoys: [
      "Bullfrog",
      "Common toad",
      "Tree frog",
      "Fire salamander"
    ]
  },
  {
    id: "fe8e8e4bc6a2ddcb",
    category: "funny",
    question: "Which frog is named for the glass-like translucency of its underside?",
    truth: "Glass frog",
    aliases: [
      "Glassfrog",
      "A glass frog"
    ],
    decoys: [
      "Crystal toad",
      "Window frog",
      "Diamond frog",
      "Mirror frog"
    ]
  },
  {
    id: "dafca1cad8cbb0b6",
    category: "funny",
    question: "Which reptile can shed its tail to escape and later regrow it?",
    truth: "Gecko",
    aliases: [
      "A gecko",
      "Geckos"
    ],
    decoys: [
      "Tortoise",
      "Crocodile",
      "Python",
      "Alligator"
    ]
  },
  {
    id: "2f68570dc6104c58",
    category: "funny",
    question: "What material makes up a rhinoceros's horn, also found in human fingernails?",
    truth: "Keratin",
    aliases: [],
    decoys: [
      "Ivory",
      "Bone",
      "Cartilage",
      "Enamel"
    ]
  },
  {
    id: "b82a74d5943d9a09",
    category: "funny",
    question: "Which large sea mammal has long whiskers and prominent tusks?",
    truth: "Walrus",
    aliases: [
      "A walrus"
    ],
    decoys: [
      "Dugong",
      "Manatee",
      "Orca",
      "Beluga"
    ]
  },
  {
    id: "8d372a633819aed6",
    category: "funny",
    question: "Which bird can drum rapidly on trees without using its feet?",
    truth: "Woodpecker",
    aliases: [
      "A woodpecker"
    ],
    decoys: [
      "Kingfisher",
      "Pigeon",
      "Quail",
      "Peacock"
    ]
  },
  {
    id: "df87c068e8ef3f13",
    category: "funny",
    question: "Which insect performs a waggle dance to communicate food locations?",
    truth: "Honeybee",
    aliases: [
      "Honey bee",
      "Honeybees"
    ],
    decoys: [
      "Bumblebee moth",
      "Dragonfly",
      "Ladybird",
      "Termite"
    ]
  },
  {
    id: "ea36aca74560841b",
    category: "funny",
    question: "Which insect produces silk to build the cocoon used in traditional silk production?",
    truth: "Silkworm",
    aliases: [
      "Silkworm larva",
      "A silkworm"
    ],
    decoys: [
      "Mealworm",
      "Earthworm",
      "Glowworm",
      "Flatworm"
    ]
  },
  {
    id: "f85260017a1dd722",
    category: "funny",
    question: "Which insect's rear end produces bioluminescent flashes?",
    truth: "Firefly",
    aliases: [
      "Lightning bug",
      "A firefly"
    ],
    decoys: [
      "Dragonfly",
      "Mayfly",
      "Housefly",
      "Hoverfly"
    ]
  },
  {
    id: "14a87f188ea6f651",
    category: "funny",
    question: "Which creature has eight legs but is not an insect?",
    truth: "Spider",
    aliases: [
      "A spider"
    ],
    decoys: [
      "Ant",
      "Wasp",
      "Beetle",
      "Butterfly"
    ]
  },
  {
    id: "70724f2a8380395e",
    category: "funny",
    question: "Which insect has a name suggesting it is praying with folded front legs?",
    truth: "Praying mantis",
    aliases: [
      "Mantis",
      "A praying mantis"
    ],
    decoys: [
      "Grasshopper",
      "Katydid",
      "Cricket",
      "Stick insect"
    ]
  },
  {
    id: "4ee086feb04c6b98",
    category: "funny",
    question: "Which insect is named for its twig-like camouflage?",
    truth: "Stick insect",
    aliases: [
      "Walking stick",
      "A stick insect"
    ],
    decoys: [
      "Leafhopper",
      "Stag beetle",
      "Earwig",
      "Silverfish"
    ]
  },
  {
    id: "710613eb18259e18",
    category: "funny",
    question: "Which bird is known for laying eggs in the nests of other bird species?",
    truth: "Common cuckoo",
    aliases: [
      "Cuckoo",
      "A cuckoo"
    ],
    decoys: [
      "Robin",
      "Kingfisher",
      "Woodpecker",
      "Sparrow"
    ]
  },
  {
    id: "4d2cd130af8f1439",
    category: "funny",
    question: "What do flamingos often balance on while resting?",
    truth: "One leg",
    aliases: [
      "A single leg",
      "1 leg"
    ],
    decoys: [
      "Their beaks",
      "Their tails",
      "Both wings",
      "Their backs"
    ]
  },
  {
    id: "3a699bfc16ed1645",
    category: "funny",
    question: "Which farm animal has rectangular pupils that help provide a wide field of view?",
    truth: "Goat",
    aliases: [
      "Goats",
      "A goat"
    ],
    decoys: [
      "Pig",
      "Rabbit",
      "Dog",
      "Chicken"
    ]
  },
  {
    id: "92f0904900c7ee78",
    category: "funny",
    question: "What is the name for a snail's coiled protective home?",
    truth: "Shell",
    aliases: [
      "A shell"
    ],
    decoys: [
      "Carapace plate",
      "Cocoon",
      "Chrysalis",
      "Nest"
    ]
  },
  {
    id: "40c61de18053410e",
    category: "funny",
    question: "Which mollusc shoots ink as a defensive smokescreen and has ten appendages?",
    truth: "Squid",
    aliases: [
      "A squid"
    ],
    decoys: [
      "Nautilus",
      "Clam",
      "Oyster",
      "Scallop"
    ]
  },
  {
    id: "8a76b8818541215a",
    category: "funny",
    question: "Which freshwater mammal builds dams from branches and mud?",
    truth: "Beaver",
    aliases: [
      "A beaver"
    ],
    decoys: [
      "Otter",
      "Muskrat",
      "Capybara",
      "Mink"
    ]
  },
  {
    id: "c46e929ad9935c01",
    category: "funny",
    question: "Which fruit is botanically a berry despite its curved yellow appearance?",
    truth: "Banana",
    aliases: [
      "A banana"
    ],
    decoys: [
      "Strawberry",
      "Raspberry",
      "Apple",
      "Peach"
    ]
  },
  {
    id: "4540fdf16ef9d087",
    category: "funny",
    question: "Which so-called nut is actually a legume that develops underground?",
    truth: "Peanut",
    aliases: [
      "Peanuts",
      "A peanut"
    ],
    decoys: [
      "Hazelnut",
      "Walnut",
      "Pecan",
      "Chestnut"
    ]
  },
  {
    id: "26d671288b905039",
    category: "funny",
    question: "Which tropical fruit develops from many flowers joined together?",
    truth: "Pineapple",
    aliases: [
      "A pineapple"
    ],
    decoys: [
      "Mango",
      "Avocado",
      "Papaya",
      "Passion fruit"
    ]
  },
  {
    id: "33c85f9ba8b989a7",
    category: "funny",
    question: "Which spice comes from the dried flower buds of a tree?",
    truth: "Cloves",
    aliases: [
      "Clove"
    ],
    decoys: [
      "Cinnamon",
      "Cumin",
      "Nutmeg",
      "Ginger"
    ]
  },
  {
    id: "fe4d7730f533911b",
    category: "funny",
    question: "Which spice is made from the stigmas of crocus flowers?",
    truth: "Saffron",
    aliases: [],
    decoys: [
      "Turmeric",
      "Paprika",
      "Cinnamon",
      "Cardamom"
    ]
  },
  {
    id: "c84cd21b12428f5d",
    category: "funny",
    question: "Which spice comes from the inner bark of certain trees?",
    truth: "Cinnamon",
    aliases: [],
    decoys: [
      "Vanilla",
      "Nutmeg",
      "Cloves",
      "Coriander"
    ]
  },
  {
    id: "3b96db044cd3f867",
    category: "funny",
    question: "Which kitchen spice is a dried orchid fruit often called a bean?",
    truth: "Vanilla",
    aliases: [],
    decoys: [
      "Cocoa",
      "Coffee",
      "Cardamom",
      "Allspice"
    ]
  },
  {
    id: "e8cd99505f22534c",
    category: "funny",
    question: "Which hot condiment takes its heat mainly from capsaicin?",
    truth: "Chilli sauce",
    aliases: [
      "Chili sauce",
      "Hot chilli sauce"
    ],
    decoys: [
      "Mustard",
      "Wasabi",
      "Horseradish",
      "Black pepper sauce"
    ]
  },
  {
    id: "038340ad50ecd7f4",
    category: "funny",
    question: "Which purple vegetable has varieties that originally helped give it the name eggplant?",
    truth: "Aubergine",
    aliases: [
      "Eggplant",
      "An aubergine"
    ],
    decoys: [
      "Beetroot",
      "Turnip",
      "Radish",
      "Red cabbage"
    ]
  },
  {
    id: "9c5767971b220c49",
    category: "funny",
    question: "What gas makes fizzy drinks bubbly?",
    truth: "Carbon dioxide",
    aliases: [
      "CO2"
    ],
    decoys: [
      "Oxygen",
      "Nitrogen dioxide",
      "Helium",
      "Hydrogen"
    ]
  },
  {
    id: "05c23fc325184ec0",
    category: "funny",
    question: "What microorganism makes bread dough rise by producing gas?",
    truth: "Yeast",
    aliases: [],
    decoys: [
      "Algae",
      "Amoeba",
      "Moss",
      "Lichen"
    ]
  },
  {
    id: "dcf2e375757e7aad",
    category: "funny",
    question: "What sweet substance do bees make from nectar?",
    truth: "Honey",
    aliases: [],
    decoys: [
      "Molasses",
      "Maple syrup",
      "Caramel",
      "Treacle"
    ]
  },
  {
    id: "4c7047db7ebf3149",
    category: "funny",
    question: "Which sweet treat shares its name with a fluffy cloud-like form of spun sugar?",
    truth: "Cotton candy",
    aliases: [
      "Candy floss",
      "Fairy floss"
    ],
    decoys: [
      "Rock candy",
      "Fudge",
      "Toffee",
      "Nougat"
    ]
  },
  {
    id: "4c6d7cff70309ec4",
    category: "funny",
    question: "What is the tiny plastic or metal tip on a shoelace called?",
    truth: "Aglet",
    aliases: [
      "An aglet"
    ],
    decoys: [
      "Grommet",
      "Ferrule ring",
      "Rivet",
      "Toggle"
    ]
  },
  {
    id: "99f68993434b623d",
    category: "funny",
    question: "What is the dot above a lowercase i or j called?",
    truth: "Tittle",
    aliases: [
      "A tittle"
    ],
    decoys: [
      "Umlaut",
      "Cedilla",
      "Macron",
      "Breve"
    ]
  },
  {
    id: "14e08f503e2d8b0b",
    category: "funny",
    question: "What is the curved metal wire that holds a cork in a champagne bottle called?",
    truth: "Muselet",
    aliases: [
      "A muselet",
      "Wire cage"
    ],
    decoys: [
      "Aglet",
      "Grommet",
      "Hasp",
      "Carabiner"
    ]
  },
  {
    id: "9a1a6a1c9e7c356c",
    category: "funny",
    question: "What is the indentation between the nose and upper lip called?",
    truth: "Philtrum",
    aliases: [
      "The philtrum"
    ],
    decoys: [
      "Septum",
      "Frenulum",
      "Tragus",
      "Glabella"
    ]
  },
  {
    id: "3692f3af1d76ac9c",
    category: "funny",
    question: "What is the space between the eyebrows called?",
    truth: "Glabella",
    aliases: [
      "The glabella"
    ],
    decoys: [
      "Philtrum",
      "Tragus",
      "Helix",
      "Nasion ridge"
    ]
  },
  {
    id: "597399000a31af74",
    category: "funny",
    question: "What is the projecting flap of cartilage just in front of the ear canal called?",
    truth: "Tragus",
    aliases: [
      "The tragus"
    ],
    decoys: [
      "Philtrum",
      "Patella",
      "Uvula",
      "Glabella"
    ]
  },
  {
    id: "f9cc09a85608fd3a",
    category: "funny",
    question: "What is the dangling tissue at the back of your mouth called?",
    truth: "Uvula",
    aliases: [
      "The uvula"
    ],
    decoys: [
      "Epiglottis",
      "Tonsil crypt",
      "Tragus",
      "Frenulum"
    ]
  },
  {
    id: "e10b3907a47040fe",
    category: "funny",
    question: "What is the technical name for the kneecap?",
    truth: "Patella",
    aliases: [
      "The patella"
    ],
    decoys: [
      "Scapula",
      "Clavicle",
      "Tibia",
      "Fibula"
    ]
  },
  {
    id: "f061ef54cb8cad9b",
    category: "funny",
    question: "What is the technical name for the shoulder blade?",
    truth: "Scapula",
    aliases: [
      "The scapula"
    ],
    decoys: [
      "Patella",
      "Clavicle",
      "Sternum",
      "Pelvis"
    ]
  },
  {
    id: "d40d8c55af134af7",
    category: "funny",
    question: "What is the technical name for the collarbone?",
    truth: "Clavicle",
    aliases: [
      "The clavicle"
    ],
    decoys: [
      "Scapula",
      "Sternum",
      "Radius",
      "Ulna"
    ]
  },
  {
    id: "0b367ee66ba473db",
    category: "funny",
    question: "What is the name for the familiar earthy smell after rain on dry ground?",
    truth: "Petrichor",
    aliases: [],
    decoys: [
      "Ozone mist",
      "Terracotta",
      "Humus haze",
      "Dewfall"
    ]
  },
  {
    id: "4ba2fa7e4bafb78e",
    category: "funny",
    question: "What is the word for the rumbling sound made by a hungry stomach?",
    truth: "Borborygmus",
    aliases: [
      "Borborygmi"
    ],
    decoys: [
      "Bruxism",
      "Tinnitus",
      "Crepitus",
      "Hiccup"
    ]
  },
  {
    id: "3df627067fcf38ea",
    category: "funny",
    question: "What is the term for grinding your teeth, often during sleep?",
    truth: "Bruxism",
    aliases: [],
    decoys: [
      "Borborygmus",
      "Tinnitus",
      "Sternutation",
      "Piloerection"
    ]
  },
  {
    id: "01ff0e260ded6397",
    category: "funny",
    question: "What is the technical term for goosebumps caused by tiny hairs standing up?",
    truth: "Piloerection",
    aliases: [],
    decoys: [
      "Perspiration",
      "Sternutation",
      "Bruxism",
      "Vasodilation"
    ]
  },
  {
    id: "36cb1f7a2b37fb1a",
    category: "funny",
    question: "What is the medical term for a sneeze?",
    truth: "Sternutation",
    aliases: [],
    decoys: [
      "Mastication",
      "Deglutition",
      "Lacrimation",
      "Phonation"
    ]
  },
  {
    id: "d5725e4ac5a55bb1",
    category: "funny",
    question: "What is the formal word for chewing food?",
    truth: "Mastication",
    aliases: [],
    decoys: [
      "Deglutition",
      "Respiration",
      "Phonation",
      "Lacrimation"
    ]
  },
  {
    id: "5610ff25f1c5413a",
    category: "funny",
    question: "What is the formal word for swallowing?",
    truth: "Deglutition",
    aliases: [],
    decoys: [
      "Mastication",
      "Sternutation",
      "Lacrimation",
      "Phonation"
    ]
  },
  {
    id: "c21fdded8d521251",
    category: "funny",
    question: "What is the tear-producing process called?",
    truth: "Lacrimation",
    aliases: [],
    decoys: [
      "Mastication",
      "Deglutition",
      "Ossification",
      "Keratinization"
    ]
  },
  {
    id: "9db54bf39f9f260a",
    category: "funny",
    question: "Which planet rotates so slowly that one axial rotation takes longer than one orbit around the Sun?",
    truth: "Venus",
    aliases: [],
    decoys: [
      "Mars",
      "Earth",
      "Jupiter",
      "Neptune"
    ]
  },
  {
    id: "b7267843c075a76f",
    category: "funny",
    question: "Which planet rolls around the Sun with its rotation axis tilted almost sideways?",
    truth: "Uranus",
    aliases: [],
    decoys: [
      "Mars",
      "Jupiter",
      "Mercury",
      "Saturn"
    ]
  },
  {
    id: "af10bc0eeb36eae0",
    category: "funny",
    question: "Which planet's Great Red Spot is a giant storm rather than a stain?",
    truth: "Jupiter",
    aliases: [],
    decoys: [
      "Mars",
      "Venus",
      "Mercury",
      "Neptune"
    ]
  },
  {
    id: "7be74a65813a221c",
    category: "funny",
    question: "Which dwarf planet was reclassified from planet status in 2006?",
    truth: "Pluto",
    aliases: [],
    decoys: [
      "Ceres",
      "Eris",
      "Haumea",
      "Makemake"
    ]
  },
  {
    id: "c84e6d5e6ccc7eee",
    category: "funny",
    question: "Which planet has a hexagon-shaped atmospheric pattern around its north pole?",
    truth: "Saturn",
    aliases: [],
    decoys: [
      "Mars",
      "Venus",
      "Mercury",
      "Earth"
    ]
  },
  {
    id: "22ca412c233eec4e",
    category: "funny",
    question: "Which planet is named after the Roman god of the sea?",
    truth: "Neptune",
    aliases: [],
    decoys: [
      "Mercury",
      "Mars",
      "Jupiter",
      "Uranus"
    ]
  },
  {
    id: "87e7b2a6efc44786",
    category: "funny",
    question: "Which planet is named after the Roman messenger god?",
    truth: "Mercury",
    aliases: [],
    decoys: [
      "Venus",
      "Mars",
      "Saturn",
      "Neptune"
    ]
  },
  {
    id: "c899d6f5a5f077aa",
    category: "funny",
    question: "What is the name of Mars's enormous volcano, the largest in the solar system?",
    truth: "Olympus Mons",
    aliases: [
      "Olympus"
    ],
    decoys: [
      "Mount Etna",
      "Mauna Loa",
      "Arsia Plain",
      "Valles Marineris"
    ]
  },
  {
    id: "1c4527bd19f60090",
    category: "funny",
    question: "Which moon of Saturn has lakes and seas of liquid methane and ethane?",
    truth: "Titan",
    aliases: [],
    decoys: [
      "Europa",
      "Io",
      "Ganymede",
      "Phobos"
    ]
  },
  {
    id: "73d6e8e70e4b1723",
    category: "funny",
    question: "Which moon of Jupiter is famous for intense volcanic activity?",
    truth: "Io",
    aliases: [],
    decoys: [
      "Europa",
      "Callisto",
      "Ganymede",
      "Triton"
    ]
  },
  {
    id: "12effda807570cac",
    category: "funny",
    question: "Which moon of Jupiter has an icy surface crisscrossed with dark lines and a subsurface ocean?",
    truth: "Europa",
    aliases: [],
    decoys: [
      "Io",
      "Phobos",
      "Deimos",
      "Mimas"
    ]
  },
  {
    id: "2da3e215bf565816",
    category: "funny",
    question: "What is the name of the dark volcanic plains on the Moon, Latin for seas?",
    truth: "Maria",
    aliases: [
      "Lunar maria",
      "Mare"
    ],
    decoys: [
      "Montes",
      "Terrae",
      "Rupes",
      "Valles"
    ]
  },
  {
    id: "d1cf8d21cf68890b",
    category: "funny",
    question: "What do astronauts experience in orbit that makes them appear to float?",
    truth: "Microgravity",
    aliases: [
      "Weightlessness",
      "Free fall"
    ],
    decoys: [
      "No inertia",
      "No mass",
      "Reverse magnetism",
      "No momentum"
    ]
  },
  {
    id: "3a515d2ee438ed2a",
    category: "funny",
    question: "What are the colourful polar lights in the northern hemisphere called?",
    truth: "Aurora borealis",
    aliases: [
      "Northern lights",
      "The northern lights"
    ],
    decoys: [
      "Aurora australis",
      "Zodiacal light",
      "Airglow",
      "Solar halo"
    ]
  },
  {
    id: "22d07321ad47788c",
    category: "funny",
    question: "Which everyday seasoning is a rock that humans regularly eat?",
    truth: "Salt",
    aliases: [
      "Table salt",
      "Sodium chloride"
    ],
    decoys: [
      "Pepper",
      "Paprika",
      "Cumin",
      "Cinnamon"
    ]
  },
  {
    id: "a087e81dcd390b86",
    category: "funny",
    question: "What volcanic rock is light enough to float on water when sufficiently porous?",
    truth: "Pumice",
    aliases: [],
    decoys: [
      "Granite",
      "Basalt",
      "Marble",
      "Obsidian"
    ]
  },
  {
    id: "135ee5638f22aa51",
    category: "funny",
    question: "What volcanic glass was historically used to make extremely sharp tools?",
    truth: "Obsidian",
    aliases: [],
    decoys: [
      "Pumice",
      "Chalk",
      "Slate",
      "Granite"
    ]
  },
  {
    id: "3d3fb4a6cbdc7a74",
    category: "funny",
    question: "What mineral is used as the core in a pencil, despite the word lead?",
    truth: "Graphite",
    aliases: [],
    decoys: [
      "Lead",
      "Charcoal",
      "Basalt",
      "Mica"
    ]
  },
  {
    id: "a87f56304f7a000d",
    category: "funny",
    question: "Which metal is liquid at a typical room temperature of 20\xB0C?",
    truth: "Mercury",
    aliases: [
      "Hg"
    ],
    decoys: [
      "Gallium",
      "Silver",
      "Tin",
      "Lead"
    ]
  },
  {
    id: "af3ac9558e1c612b",
    category: "funny",
    question: "Which metal can melt in a warm hand because its melting point is about 30\xB0C?",
    truth: "Gallium",
    aliases: [
      "Ga"
    ],
    decoys: [
      "Aluminium",
      "Copper",
      "Tin",
      "Zinc"
    ]
  },
  {
    id: "a788db1863592f0e",
    category: "funny",
    question: "What is the name of the process by which dry ice turns directly into gas?",
    truth: "Sublimation",
    aliases: [],
    decoys: [
      "Condensation",
      "Melting",
      "Deposition",
      "Freezing"
    ]
  },
  {
    id: "1e19e22500cdc03c",
    category: "funny",
    question: "What substance is dry ice made of?",
    truth: "Carbon dioxide",
    aliases: [
      "Solid carbon dioxide",
      "CO2"
    ],
    decoys: [
      "Water",
      "Nitrogen",
      "Oxygen",
      "Methane"
    ]
  },
  {
    id: "963501d1201f5e61",
    category: "funny",
    question: "What makes a soap bubble's surface show rainbow-like colours?",
    truth: "Thin-film interference",
    aliases: [
      "Interference"
    ],
    decoys: [
      "Radioactivity",
      "Magnetic induction",
      "Nuclear fusion",
      "Static friction"
    ]
  },
  {
    id: "1b035e6119b540f2",
    category: "funny",
    question: "Which optical phenomenon makes a pencil look bent where it enters water?",
    truth: "Refraction",
    aliases: [],
    decoys: [
      "Reflection only",
      "Diffusion",
      "Magnetism",
      "Conduction"
    ]
  },
  {
    id: "f5707af9ee68a482",
    category: "funny",
    question: "Which sea bird has a large throat pouch used to scoop up fish?",
    truth: "Pelican",
    aliases: [
      "A pelican"
    ],
    decoys: [
      "Puffin",
      "Cormorant",
      "Albatross",
      "Gannet"
    ]
  },
  {
    id: "e1e1df05db9403a3",
    category: "funny",
    question: "Which colourful bird has a very large, lightweight bill and lives in tropical America?",
    truth: "Toucan",
    aliases: [
      "A toucan"
    ],
    decoys: [
      "Hornbill",
      "Kingfisher",
      "Macaw",
      "Hoopoe"
    ]
  },
  {
    id: "19038097748ed7c7",
    category: "funny",
    question: "Which small mammal is famous for rolling into a ball covered in spines?",
    truth: "Hedgehog",
    aliases: [
      "A hedgehog"
    ],
    decoys: [
      "Mole",
      "Shrew",
      "Weasel",
      "Ferret"
    ]
  },
  {
    id: "692ae989216c506e",
    category: "funny",
    question: "Which spotted scavenging mammal has a call often described as laughing?",
    truth: "Spotted hyena",
    aliases: [
      "Hyena",
      "A spotted hyena"
    ],
    decoys: [
      "African wild dog",
      "Jackal",
      "Mongoose",
      "Meerkat"
    ]
  },
  {
    id: "b491a8d3cf1b3b50",
    category: "funny",
    question: "Which lizard has a name suggesting a mythical fire-breathing creature and lives on Indonesian islands?",
    truth: "Komodo dragon",
    aliases: [
      "A Komodo dragon"
    ],
    decoys: [
      "Bearded dragon",
      "Water monitor",
      "Frilled lizard",
      "Basilisk"
    ]
  },
  {
    id: "de3e99f9416b2634",
    category: "funny",
    question: "Which Australian lizard opens a large neck frill when threatened?",
    truth: "Frilled lizard",
    aliases: [
      "Frill-necked lizard",
      "A frilled lizard"
    ],
    decoys: [
      "Bearded dragon",
      "Blue-tongued skink",
      "Gecko",
      "Thorny devil"
    ]
  },
  {
    id: "fd56a87ac13a0bc7",
    category: "funny",
    question: "Which spiky Australian lizard has a distinctly devilish common name?",
    truth: "Thorny devil",
    aliases: [
      "A thorny devil"
    ],
    decoys: [
      "Horned viper",
      "Spiny dragonfly",
      "Desert imp",
      "Prickly gecko"
    ]
  },
  {
    id: "5b457c0a514df43e",
    category: "funny",
    question: "Which lizard group gets its common name from the bright colour of its tongue?",
    truth: "Blue-tongued skink",
    aliases: [
      "Blue tongue skink",
      "Blue-tongue skink"
    ],
    decoys: [
      "Red-throated anole",
      "Green iguana",
      "Yellow-bellied gecko",
      "Orange-tailed monitor"
    ]
  },
  {
    id: "4b026bbac0188f71",
    category: "funny",
    question: "Which primate from Madagascar has a long black-and-white striped tail?",
    truth: "Ring-tailed lemur",
    aliases: [
      "A ring-tailed lemur"
    ],
    decoys: [
      "Aye-aye",
      "Indri",
      "Sifaka",
      "Tarsier"
    ]
  },
  {
    id: "4b36ca80f9e093d6",
    category: "funny",
    question: "Which nocturnal primate uses a very long, thin middle finger to extract food from wood?",
    truth: "Aye-aye",
    aliases: [
      "Aye aye",
      "An aye-aye"
    ],
    decoys: [
      "Loris",
      "Tarsier",
      "Marmoset",
      "Capuchin"
    ]
  },
  {
    id: "3d2eb61a8c1e1d7a",
    category: "funny",
    question: "Which monkey is named for its unusually large nose?",
    truth: "Proboscis monkey",
    aliases: [
      "A proboscis monkey"
    ],
    decoys: [
      "Spider monkey",
      "Howler monkey",
      "Squirrel monkey",
      "Vervet monkey"
    ]
  },
  {
    id: "a1b00ac6c51004ec",
    category: "funny",
    question: "Which monkey is famous for booming calls that carry through the forest?",
    truth: "Howler monkey",
    aliases: [
      "A howler monkey"
    ],
    decoys: [
      "Spider monkey",
      "Capuchin",
      "Marmoset",
      "Tamarin"
    ]
  },
  {
    id: "cf2e6a864d0a5151",
    category: "funny",
    question: "Which bird has a spectacular fan-shaped tail displayed by the male?",
    truth: "Peacock",
    aliases: [
      "Male peafowl",
      "A peacock"
    ],
    decoys: [
      "Peahen",
      "Turkey vulture",
      "Guineafowl",
      "Pheasant crow"
    ]
  },
  {
    id: "11ec42baa728561f",
    category: "funny",
    question: "Which fish group can glide above water using enlarged fins as wings?",
    truth: "Flying fish",
    aliases: [
      "Flyingfish"
    ],
    decoys: [
      "Sailfish",
      "Swordfish",
      "Pufferfish",
      "Sunfish"
    ]
  },
  {
    id: "b4e4ed1a4c021006",
    category: "funny",
    question: "Which flat fish looks like an underwater pancake with eyes on its upper side?",
    truth: "Flounder",
    aliases: [
      "A flounder"
    ],
    decoys: [
      "Tuna",
      "Mackerel",
      "Marlin",
      "Pike"
    ]
  },
  {
    id: "4445b1d0a47fbdcb",
    category: "funny",
    question: "Which crustacean carries a borrowed snail shell as a portable home?",
    truth: "Hermit crab",
    aliases: [
      "A hermit crab"
    ],
    decoys: [
      "Fiddler crab",
      "Horseshoe crab",
      "Barnacle",
      "Krill"
    ]
  },
  {
    id: "017869b9cc9dd5ff",
    category: "funny",
    question: "Which large ocean fish is also called a mola and looks like a swimming head?",
    truth: "Ocean sunfish",
    aliases: [
      "Sunfish",
      "Mola mola"
    ],
    decoys: [
      "Sailfish",
      "Marlin",
      "Manta ray",
      "Basking shark"
    ]
  },
  {
    id: "9b17035a269b55c4",
    category: "funny",
    question: "Which toothless mammal uses a long sticky tongue to eat ants and termites?",
    truth: "Giant anteater",
    aliases: [
      "Anteater",
      "A giant anteater"
    ],
    decoys: [
      "Aardwolf",
      "Meerkat",
      "Badger",
      "Warthog"
    ]
  },
  {
    id: "c8eb70bd8e5c42b2",
    category: "funny",
    question: "Which mammal has a tough protective armour made of bony plates?",
    truth: "Armadillo",
    aliases: [
      "An armadillo"
    ],
    decoys: [
      "Pangolin",
      "Porcupine",
      "Echidna",
      "Hedgehog"
    ]
  },
  {
    id: "965844104c9fa172",
    category: "funny",
    question: "Which African animal has a pig-like snout and a name meaning earth pig in Afrikaans?",
    truth: "Aardvark",
    aliases: [
      "An aardvark"
    ],
    decoys: [
      "Warthog",
      "Bushpig",
      "Aardwolf",
      "Meerkat"
    ]
  },
  {
    id: "a7860813f123d276",
    category: "funny",
    question: "Which tiny desert fox has very large ears that help release heat?",
    truth: "Fennec fox",
    aliases: [
      "Fennec",
      "A fennec fox"
    ],
    decoys: [
      "Arctic fox",
      "Red fox",
      "Kitten fox",
      "Grey fox"
    ]
  },
  {
    id: "842ad27f5c2b8422",
    category: "funny",
    question: "Which Australian bird has a bright blue head, a helmet-like casque, and a reputation for powerful kicks?",
    truth: "Cassowary",
    aliases: [
      "A cassowary"
    ],
    decoys: [
      "Emu",
      "Ostrich",
      "Rhea",
      "Kiwi"
    ]
  },
  {
    id: "03ace41339dc2425",
    category: "funny",
    question: "Which New Zealand bird has nostrils near the tip of its long beak?",
    truth: "Kiwi",
    aliases: [
      "A kiwi"
    ],
    decoys: [
      "Kea",
      "Kakapo",
      "Takahe",
      "Weka"
    ]
  },
  {
    id: "a4383d9f405bc727",
    category: "funny",
    question: "Which New Zealand parrot is heavy, nocturnal, and flightless?",
    truth: "Kakapo",
    aliases: [
      "K\u0101k\u0101p\u014D",
      "A kakapo"
    ],
    decoys: [
      "Kea",
      "Macaw",
      "Cockatoo",
      "Lorikeet"
    ]
  },
  {
    id: "586953ef76357a16",
    category: "funny",
    question: "Which alpine New Zealand parrot is famous for curious behaviour and investigating objects?",
    truth: "Kea",
    aliases: [
      "A kea"
    ],
    decoys: [
      "Kakapo",
      "Budgerigar",
      "Eclectus",
      "Cockatiel"
    ]
  },
  {
    id: "589a86a502c6984e",
    category: "funny",
    question: "Which mammal has a broad flat tail that it slaps against water as an alarm?",
    truth: "Beaver",
    aliases: [
      "A beaver"
    ],
    decoys: [
      "Otter",
      "Capybara",
      "Mink",
      "Muskrat"
    ]
  },
  {
    id: "72af49830316e1e4",
    category: "funny",
    question: "Which large aquatic herbivore is commonly nicknamed a sea cow?",
    truth: "Manatee",
    aliases: [
      "A manatee"
    ],
    decoys: [
      "Walrus",
      "Sea lion",
      "Elephant seal",
      "Beluga"
    ]
  },
  {
    id: "24c040427d4a9176",
    category: "funny",
    question: "Which black-and-white dolphin is commonly called a killer whale?",
    truth: "Orca",
    aliases: [
      "Killer whale",
      "An orca"
    ],
    decoys: [
      "Beluga",
      "Narwhal",
      "Pilot whale",
      "Sperm whale"
    ]
  },
  {
    id: "bcd68f6de6c0e244",
    category: "funny",
    question: "Which white Arctic whale is nicknamed the canary of the sea for its vocalizations?",
    truth: "Beluga",
    aliases: [
      "Beluga whale",
      "A beluga"
    ],
    decoys: [
      "Narwhal",
      "Orca",
      "Bowhead whale",
      "Blue whale"
    ]
  },
  {
    id: "d0d537875da4ff1e",
    category: "tricky",
    question: "You overtake the runner in second place. What position are you now in?",
    truth: "Second",
    aliases: [
      "2nd",
      "Second place"
    ],
    decoys: [
      "First",
      "Third",
      "Last",
      "Tied for first"
    ]
  },
  {
    id: "fa7e1feaa7a02420",
    category: "tricky",
    question: "A farmer has 17 sheep. All but nine run away. How many remain?",
    truth: "Nine",
    aliases: [
      "9"
    ],
    decoys: [
      "Eight",
      "Seventeen",
      "Zero",
      "Seven"
    ]
  },
  {
    id: "425d916f8f94ba74",
    category: "tricky",
    question: "How many months have at least 28 days in a normal year?",
    truth: "Twelve",
    aliases: [
      "12",
      "All twelve",
      "All 12"
    ],
    decoys: [
      "One",
      "Two",
      "Eleven",
      "Six"
    ]
  },
  {
    id: "c206a3fb8e2dc7aa",
    category: "tricky",
    question: "A rooster stands on a roof. How many eggs can that rooster lay?",
    truth: "Zero",
    aliases: [
      "0",
      "None",
      "Roosters do not lay eggs"
    ],
    decoys: [
      "One",
      "Two",
      "Three",
      "Four"
    ]
  },
  {
    id: "9f8e50764d703198",
    category: "tricky",
    question: "An electric train moves north. Which direction does its steam blow?",
    truth: "It produces no steam",
    aliases: [
      "No steam",
      "None",
      "There is no steam"
    ],
    decoys: [
      "North",
      "South",
      "East",
      "West"
    ]
  },
  {
    id: "a941350f991cad80",
    category: "tricky",
    question: "A race has ten runners. Is it possible to overtake the runner who is currently last while you are also in that same race, without lapping anyone?",
    truth: "No",
    aliases: [
      "Impossible",
      "It is not possible"
    ],
    decoys: [
      "Yes always",
      "Only uphill",
      "Only at the finish",
      "Only if tied"
    ]
  },
  {
    id: "896cf9b5fcccdb32",
    category: "tricky",
    question: "Two fathers and two sons go fishing, but there are only three people. Who is the middle generation?",
    truth: "Father and son",
    aliases: [
      "Both father and son",
      "A father and a son"
    ],
    decoys: [
      "Two brothers",
      "Two cousins",
      "Uncle and nephew",
      "Father and uncle"
    ]
  },
  {
    id: "0cef86501fe0c512",
    category: "tricky",
    question: "You have three apples and take two away. How many apples have you taken?",
    truth: "Two",
    aliases: [
      "2"
    ],
    decoys: [
      "One",
      "Three",
      "Five",
      "Zero"
    ]
  },
  {
    id: "abb6f745cac8e8c4",
    category: "tricky",
    question: "Five machines make five widgets in five minutes. How many minutes do 100 identical machines need for 100 widgets?",
    truth: "Five",
    aliases: [
      "5",
      "5 minutes",
      "Five minutes"
    ],
    decoys: [
      "One",
      "Twenty",
      "One hundred",
      "Five hundred"
    ]
  },
  {
    id: "50fa9607e4358991",
    category: "tricky",
    question: "A bat and ball cost 110 rupees together. The bat costs 100 rupees more than the ball. What does the ball cost?",
    truth: "5 rupees",
    aliases: [
      "5",
      "Five rupees"
    ],
    decoys: [
      "10 rupees",
      "1 rupee",
      "15 rupees",
      "55 rupees"
    ]
  },
  {
    id: "67950d8f4394c84d",
    category: "tricky",
    question: "A pond's lily patch doubles daily and covers the whole pond on day 30. On which day was it half covered?",
    truth: "Day 29",
    aliases: [
      "29",
      "Twenty-nine"
    ],
    decoys: [
      "Day 15",
      "Day 28",
      "Day 20",
      "Day 10"
    ]
  },
  {
    id: "cfb57da68399ccc8",
    category: "tricky",
    question: "You need one tablet now and another every 30 minutes until three tablets are taken. How many minutes from first to last?",
    truth: "60",
    aliases: [
      "Sixty",
      "60 minutes",
      "One hour"
    ],
    decoys: [
      "30",
      "90",
      "120",
      "150"
    ]
  },
  {
    id: "4fddf2413c072dc7",
    category: "tricky",
    question: "A snail climbs 3 metres each day and slips 2 metres each night. How many days to get out of a 10-metre well?",
    truth: "Eight",
    aliases: [
      "8",
      "Eight days"
    ],
    decoys: [
      "Ten",
      "Nine",
      "Seven",
      "Six"
    ]
  },
  {
    id: "75ac4a2ef9f6240b",
    category: "tricky",
    question: "Three friends each shake hands once with each other. How many handshakes occur?",
    truth: "Three",
    aliases: [
      "3"
    ],
    decoys: [
      "Two",
      "Six",
      "Nine",
      "One"
    ]
  },
  {
    id: "fec9388c797aa26a",
    category: "tricky",
    question: "Four friends each shake hands once with each other. How many handshakes occur?",
    truth: "Six",
    aliases: [
      "6"
    ],
    decoys: [
      "Four",
      "Eight",
      "Twelve",
      "Sixteen"
    ]
  },
  {
    id: "e85f62a3add18241",
    category: "tricky",
    question: "Two coins total 30 cents. One of them is not a nickel. What is the other coin besides the quarter?",
    truth: "Nickel",
    aliases: [
      "A nickel",
      "5-cent coin",
      "Five-cent coin"
    ],
    decoys: [
      "Dime",
      "Penny",
      "Half dollar",
      "Another quarter"
    ]
  },
  {
    id: "8ec80a8a723b6af3",
    category: "tricky",
    question: "Which is heavier: one kilogram of feathers or one kilogram of steel?",
    truth: "They weigh the same",
    aliases: [
      "Same",
      "Equal",
      "The same",
      "Both the same"
    ],
    decoys: [
      "Feathers",
      "Steel",
      "Neither has weight",
      "It depends on colour"
    ]
  },
  {
    id: "15f8dd92cd7a0851",
    category: "tricky",
    question: "At 3:15 on an analogue clock, what is the smaller angle between the hands?",
    truth: "7.5 degrees",
    aliases: [
      "7.5",
      "Seven and a half degrees"
    ],
    decoys: [
      "0 degrees",
      "15 degrees",
      "30 degrees",
      "90 degrees"
    ]
  },
  {
    id: "9c1143c2a07d47fb",
    category: "tricky",
    question: "At exactly 6:00, what angle separates the hour and minute hands?",
    truth: "180 degrees",
    aliases: [
      "180",
      "One hundred eighty degrees"
    ],
    decoys: [
      "0 degrees",
      "90 degrees",
      "120 degrees",
      "360 degrees"
    ]
  },
  {
    id: "ae55cac40854d8fc",
    category: "tricky",
    question: "What is half of two plus two, if only the first two is halved?",
    truth: "Three",
    aliases: [
      "3"
    ],
    decoys: [
      "Two",
      "One",
      "Four",
      "Six"
    ]
  },
  {
    id: "34abba31fa1eb95c",
    category: "tricky",
    question: "What is 6 divided by one-half?",
    truth: "Twelve",
    aliases: [
      "12"
    ],
    decoys: [
      "Three",
      "Six",
      "Nine",
      "Twenty-four"
    ]
  },
  {
    id: "af10646e9571d26d",
    category: "tricky",
    question: "What is 0.5 multiplied by 0.5?",
    truth: "0.25",
    aliases: [
      "One quarter",
      "A quarter"
    ],
    decoys: [
      "0.5",
      "1",
      "0.1",
      "2.5"
    ]
  },
  {
    id: "67cad9d4dad64608",
    category: "tricky",
    question: "What is the next number: 1, 1, 2, 3, 5, 8, ...?",
    truth: "13",
    aliases: [
      "Thirteen"
    ],
    decoys: [
      "11",
      "12",
      "14",
      "16"
    ]
  },
  {
    id: "c89a70c38d7771bb",
    category: "tricky",
    question: "What is the next number in the square-number sequence 1, 4, 9, 16, ...?",
    truth: "25",
    aliases: [
      "Twenty-five"
    ],
    decoys: [
      "20",
      "24",
      "26",
      "32"
    ]
  },
  {
    id: "41c1dff286b61428",
    category: "tricky",
    question: "What is the next number in 2, 6, 12, 20, 30, ... if the gaps rise by two each time?",
    truth: "42",
    aliases: [
      "Forty-two"
    ],
    decoys: [
      "36",
      "40",
      "44",
      "48"
    ]
  },
  {
    id: "799219ddd6bd2491",
    category: "tricky",
    question: "What is the next number in 1, 8, 27, 64, ... if these are cubes?",
    truth: "125",
    aliases: [
      "One hundred twenty-five"
    ],
    decoys: [
      "100",
      "121",
      "128",
      "144"
    ]
  },
  {
    id: "0c01fe815c9d51c8",
    category: "tricky",
    question: "A number multiplied by zero equals what?",
    truth: "Zero",
    aliases: [
      "0"
    ],
    decoys: [
      "The original number",
      "One",
      "Infinity",
      "Undefined"
    ]
  },
  {
    id: "b040dfcad71d9d70",
    category: "tricky",
    question: "What is the value of zero factorial, written 0!?",
    truth: "One",
    aliases: [
      "1"
    ],
    decoys: [
      "Zero",
      "Undefined",
      "Infinity",
      "Negative one"
    ]
  },
  {
    id: "7a8352d0fc1339da",
    category: "tricky",
    question: "What is any nonzero number raised to the power zero?",
    truth: "One",
    aliases: [
      "1"
    ],
    decoys: [
      "Zero",
      "The number itself",
      "Undefined",
      "Infinity"
    ]
  },
  {
    id: "f71f36f3c97ea8b4",
    category: "tricky",
    question: "What is the only even prime number?",
    truth: "Two",
    aliases: [
      "2"
    ],
    decoys: [
      "Zero",
      "Four",
      "Six",
      "Eight"
    ]
  },
  {
    id: "0bf005f70fcec1e6",
    category: "tricky",
    question: "How many prime numbers are less than ten?",
    truth: "Four",
    aliases: [
      "4"
    ],
    decoys: [
      "Three",
      "Five",
      "Six",
      "Two"
    ]
  },
  {
    id: "23b5bbaca7929579",
    category: "tricky",
    question: "How many degrees do a triangle's interior angles total in a flat plane?",
    truth: "180",
    aliases: [
      "180 degrees"
    ],
    decoys: [
      "90",
      "270",
      "360",
      "540"
    ]
  },
  {
    id: "8c207b9d93410602",
    category: "tricky",
    question: "How many degrees do a quadrilateral's interior angles total in a flat plane?",
    truth: "360",
    aliases: [
      "360 degrees"
    ],
    decoys: [
      "180",
      "270",
      "450",
      "540"
    ]
  },
  {
    id: "d84f65e9e98acce8",
    category: "tricky",
    question: "If all bloops are razzies and all razzies are lazzies, are all bloops definitely lazzies?",
    truth: "Yes",
    aliases: [],
    decoys: [
      "No",
      "Only half",
      "Only if blue",
      "Only at night"
    ]
  },
  {
    id: "9e2e85fc91379ee6",
    category: "tricky",
    question: "If some cats are black, does that prove that all black animals are cats?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "Only mammals",
      "Only pets",
      "Only at night"
    ]
  },
  {
    id: "b2cb47cbb55e8899",
    category: "tricky",
    question: "If a statement is false, what is the truth value of its logical negation?",
    truth: "True",
    aliases: [],
    decoys: [
      "False",
      "Both",
      "Neither",
      "Unknown"
    ]
  },
  {
    id: "458ef91bd39ad28b",
    category: "tricky",
    question: "An unopened bottle and its cork cost 110 rupees; the bottle costs 100 more than the cork. How much is the bottle?",
    truth: "105 rupees",
    aliases: [
      "105",
      "One hundred five rupees"
    ],
    decoys: [
      "100 rupees",
      "110 rupees",
      "10 rupees",
      "55 rupees"
    ]
  },
  {
    id: "074c7a0cbd0fbe89",
    category: "tricky",
    question: "A shirt is discounted 50%, then its new price is increased 50%. What percentage of the original price is it now?",
    truth: "75%",
    aliases: [
      "75",
      "Seventy-five percent"
    ],
    decoys: [
      "100%",
      "50%",
      "125%",
      "25%"
    ]
  },
  {
    id: "6c6868e9d3e3ce83",
    category: "tricky",
    question: "A price rises by 20%, then falls by 20%. Is it back at the original price?",
    truth: "No, it is lower",
    aliases: [
      "Lower",
      "No",
      "It is lower"
    ],
    decoys: [
      "Yes, exactly",
      "No, it is higher",
      "It is doubled",
      "It is zero"
    ]
  },
  {
    id: "9bde516a3e364f9f",
    category: "tricky",
    question: "You buy something for 80 and sell it for 100. What is the profit as a percentage of the purchase price?",
    truth: "25%",
    aliases: [
      "25",
      "Twenty-five percent"
    ],
    decoys: [
      "20%",
      "15%",
      "30%",
      "10%"
    ]
  },
  {
    id: "00424185bec02f0a",
    category: "tricky",
    question: "A 100-metre rope is cut into ten equal pieces. How many cuts are needed if it is not folded?",
    truth: "Nine",
    aliases: [
      "9"
    ],
    decoys: [
      "Ten",
      "Eight",
      "Eleven",
      "Five"
    ]
  },
  {
    id: "92e7319f9c5307a0",
    category: "tricky",
    question: "Ten fence posts in a straight line are 2 metres apart. How long is the fence from first to last post?",
    truth: "18 metres",
    aliases: [
      "18",
      "Eighteen metres",
      "18 meters"
    ],
    decoys: [
      "20 metres",
      "22 metres",
      "16 metres",
      "10 metres"
    ]
  },
  {
    id: "4358ee6d9e4dbdc5",
    category: "tricky",
    question: "If you roll one standard six-sided die, what number cannot appear on its top face?",
    truth: "Seven",
    aliases: [
      "7"
    ],
    decoys: [
      "One",
      "Three",
      "Five",
      "Six"
    ]
  },
  {
    id: "781d7dd0b4e43ff9",
    category: "tricky",
    question: "What is the sum of opposite faces on a standard six-sided die?",
    truth: "Seven",
    aliases: [
      "7"
    ],
    decoys: [
      "Six",
      "Eight",
      "Nine",
      "Twelve"
    ]
  },
  {
    id: "dd4f6ddcb25125b6",
    category: "tricky",
    question: "How many corners does a cube have?",
    truth: "Eight",
    aliases: [
      "8"
    ],
    decoys: [
      "Six",
      "Twelve",
      "Four",
      "Ten"
    ]
  },
  {
    id: "c034ef80a418b53a",
    category: "tricky",
    question: "How many edges does a cube have?",
    truth: "Twelve",
    aliases: [
      "12"
    ],
    decoys: [
      "Six",
      "Eight",
      "Ten",
      "Fourteen"
    ]
  },
  {
    id: "35e9fa1ca748035a",
    category: "tricky",
    question: "How many faces does a cube have?",
    truth: "Six",
    aliases: [
      "6"
    ],
    decoys: [
      "Four",
      "Eight",
      "Ten",
      "Twelve"
    ]
  },
  {
    id: "d83a0a67ed885f0d",
    category: "tricky",
    question: "If yesterday was Monday, what day is the day after tomorrow?",
    truth: "Thursday",
    aliases: [],
    decoys: [
      "Wednesday",
      "Tuesday",
      "Friday",
      "Sunday"
    ]
  },
  {
    id: "f6323c4fed38a752",
    category: "tricky",
    question: "If tomorrow is Friday, what day was yesterday?",
    truth: "Wednesday",
    aliases: [],
    decoys: [
      "Tuesday",
      "Thursday",
      "Saturday",
      "Monday"
    ]
  },
  {
    id: "0243aedee67383d4",
    category: "tricky",
    question: "Which Gregorian calendar year was a leap year: 1700, 1800, 1900, or 2000?",
    truth: "2000",
    aliases: [
      "The year 2000"
    ],
    decoys: [
      "1700",
      "1800",
      "1900",
      "None of them"
    ]
  },
  {
    id: "5474fcfdf55dd3dd",
    category: "tricky",
    question: "How many days are in February in the year 1900 under the Gregorian calendar?",
    truth: "28",
    aliases: [
      "Twenty-eight"
    ],
    decoys: [
      "29",
      "30",
      "31",
      "27"
    ]
  },
  {
    id: "75597e1027a9afd0",
    category: "tricky",
    question: "What is the 21st century's first year in the standard calendar convention?",
    truth: "2001",
    aliases: [
      "The year 2001"
    ],
    decoys: [
      "2000",
      "1999",
      "2010",
      "2100"
    ]
  },
  {
    id: "f0cfc289f73a42a0",
    category: "tricky",
    question: "What is the middle letter of the English word ALPHABET?",
    truth: "There are two middle letters",
    aliases: [
      "Two middle letters",
      "H and A",
      "HA"
    ],
    decoys: [
      "P",
      "H",
      "A",
      "B"
    ]
  },
  {
    id: "f3a8de3b48b95e6f",
    category: "tricky",
    question: "How many times does the letter F occur in the word FLUFFY?",
    truth: "Three",
    aliases: [
      "3"
    ],
    decoys: [
      "One",
      "Two",
      "Four",
      "Five"
    ]
  },
  {
    id: "1481664dfa975a57",
    category: "tricky",
    question: "Which English word comes first alphabetically: zebra, apple, banana, or pear?",
    truth: "Apple",
    aliases: [],
    decoys: [
      "Banana",
      "Pear",
      "Zebra",
      "All tie"
    ]
  },
  {
    id: "37cdcb37cc172624",
    category: "tricky",
    question: "How many letters are in the English word THREE?",
    truth: "Five",
    aliases: [
      "5"
    ],
    decoys: [
      "Three",
      "Four",
      "Six",
      "Seven"
    ]
  },
  {
    id: "d9b02a86720199df",
    category: "tricky",
    question: "How many vowels, counting only A E I O U, appear in RHYTHM?",
    truth: "Zero",
    aliases: [
      "0",
      "None"
    ],
    decoys: [
      "One",
      "Two",
      "Three",
      "Four"
    ]
  },
  {
    id: "6757460fdfb512f4",
    category: "tricky",
    question: "What number is represented by the binary digits 10?",
    truth: "Two",
    aliases: [
      "2"
    ],
    decoys: [
      "Ten",
      "One",
      "Zero",
      "Four"
    ]
  },
  {
    id: "3463c4c13a2b8b38",
    category: "tricky",
    question: "What number is represented by the Roman numeral IV?",
    truth: "Four",
    aliases: [
      "4"
    ],
    decoys: [
      "Six",
      "Five",
      "Nine",
      "Eleven"
    ]
  },
  {
    id: "d314a1e59f199537",
    category: "tricky",
    question: "What number is represented by the Roman numeral IX?",
    truth: "Nine",
    aliases: [
      "9"
    ],
    decoys: [
      "Eleven",
      "Six",
      "Four",
      "Ten"
    ]
  },
  {
    id: "4eee9395dcfb2a48",
    category: "tricky",
    question: "Which is larger: 0.9 or 0.11?",
    truth: "0.9",
    aliases: [
      "Point nine"
    ],
    decoys: [
      "0.11",
      "They are equal",
      "Neither is a number",
      "Both are zero"
    ]
  },
  {
    id: "07a8a8643db7d8a8",
    category: "tricky",
    question: "Which fraction is larger: one-third or one-quarter?",
    truth: "One-third",
    aliases: [
      "1/3",
      "A third"
    ],
    decoys: [
      "One-quarter",
      "They are equal",
      "Both are zero",
      "Neither is a fraction"
    ]
  },
  {
    id: "acba8f6173613714",
    category: "tricky",
    question: "What is 10% of 200?",
    truth: "20",
    aliases: [
      "Twenty"
    ],
    decoys: [
      "2",
      "10",
      "100",
      "2000"
    ]
  },
  {
    id: "9a9cacd2fad1e505",
    category: "tricky",
    question: "What is 200% of 10?",
    truth: "20",
    aliases: [
      "Twenty"
    ],
    decoys: [
      "2",
      "10",
      "100",
      "2000"
    ]
  },
  {
    id: "e581fb5747981e82",
    category: "tricky",
    question: "A square has side length 3 cm. What is its area?",
    truth: "9 square centimetres",
    aliases: [
      "9",
      "9 cm2",
      "9 square centimeters"
    ],
    decoys: [
      "6 square centimetres",
      "12 square centimetres",
      "3 square centimetres",
      "27 square centimetres"
    ]
  },
  {
    id: "63702f424c0c7c1c",
    category: "tricky",
    question: "A rectangle is 3 by 5 units. What is its perimeter?",
    truth: "16 units",
    aliases: [
      "16",
      "Sixteen"
    ],
    decoys: [
      "8 units",
      "15 units",
      "30 units",
      "10 units"
    ]
  },
  {
    id: "2f93f0c7c630bf7c",
    category: "tricky",
    question: "How many minutes are in one and a half hours?",
    truth: "90",
    aliases: [
      "Ninety",
      "90 minutes"
    ],
    decoys: [
      "60",
      "100",
      "120",
      "150"
    ]
  },
  {
    id: "d7e0ddeac99302c6",
    category: "tricky",
    question: "How many seconds are in two minutes?",
    truth: "120",
    aliases: [
      "One hundred twenty"
    ],
    decoys: [
      "60",
      "100",
      "180",
      "200"
    ]
  },
  {
    id: "c16424f7c959cf32",
    category: "tricky",
    question: "How many hours are in three full days?",
    truth: "72",
    aliases: [
      "Seventy-two"
    ],
    decoys: [
      "36",
      "48",
      "60",
      "96"
    ]
  },
  {
    id: "7a1de56301137fa3",
    category: "tricky",
    question: "How many centimetres are in a metre?",
    truth: "100",
    aliases: [
      "One hundred"
    ],
    decoys: [
      "10",
      "1000",
      "12",
      "60"
    ]
  },
  {
    id: "f23fb05a569860d2",
    category: "tricky",
    question: "How many millimetres are in a centimetre?",
    truth: "10",
    aliases: [
      "Ten"
    ],
    decoys: [
      "100",
      "1000",
      "12",
      "60"
    ]
  },
  {
    id: "fef334ac15b81c41",
    category: "tricky",
    question: "Which is larger in area: a square of side 4 or a rectangle measuring 2 by 8?",
    truth: "They are equal",
    aliases: [
      "Equal",
      "Same",
      "The same",
      "Both 16"
    ],
    decoys: [
      "The square",
      "The rectangle",
      "Neither has area",
      "It depends on colour"
    ]
  },
  {
    id: "7999d38c51cb69c8",
    category: "tricky",
    question: "Which is the smallest positive integer that is both a square and a cube?",
    truth: "One",
    aliases: [
      "1"
    ],
    decoys: [
      "Four",
      "Eight",
      "Nine",
      "Sixteen"
    ]
  },
  {
    id: "d10a54c3557f6385",
    category: "tricky",
    question: "How many zeros are at the end of the decimal number one million?",
    truth: "Six",
    aliases: [
      "6"
    ],
    decoys: [
      "Five",
      "Seven",
      "Eight",
      "Nine"
    ]
  },
  {
    id: "ce3874bc32ef4579",
    category: "tricky",
    question: "How many different digits are used in the decimal number system?",
    truth: "Ten",
    aliases: [
      "10"
    ],
    decoys: [
      "Nine",
      "Eleven",
      "Eight",
      "Twelve"
    ]
  },
  {
    id: "2a1ceb81a09bb44a",
    category: "tricky",
    question: "What is 3 squared plus 4 squared?",
    truth: "25",
    aliases: [
      "Twenty-five"
    ],
    decoys: [
      "7",
      "14",
      "49",
      "12"
    ]
  },
  {
    id: "4ba183080effe592",
    category: "tricky",
    question: "What is the positive square root of 144?",
    truth: "12",
    aliases: [
      "Twelve"
    ],
    decoys: [
      "14",
      "16",
      "18",
      "24"
    ]
  },
  {
    id: "ce06c65de8376ef0",
    category: "tricky",
    question: "What is the remainder when 17 is divided by 5?",
    truth: "Two",
    aliases: [
      "2"
    ],
    decoys: [
      "One",
      "Three",
      "Four",
      "Zero"
    ]
  },
  {
    id: "d70fa0440c484090",
    category: "tricky",
    question: "How many unique pairs can be formed from five different people?",
    truth: "Ten",
    aliases: [
      "10"
    ],
    decoys: [
      "Five",
      "Fifteen",
      "Twenty",
      "Twenty-five"
    ]
  },
  {
    id: "3a3b9204dfa279a1",
    category: "tricky",
    question: "A car travels 60 km in one hour, then 60 km in two hours. What is its average speed for the whole trip?",
    truth: "40 km/h",
    aliases: [
      "40",
      "Forty kilometres per hour"
    ],
    decoys: [
      "45 km/h",
      "30 km/h",
      "60 km/h",
      "90 km/h"
    ]
  },
  {
    id: "86a8ae92c04e2a80",
    category: "tricky",
    question: "A clock strikes three at 3 pm, with 2 seconds between strikes. How long from first strike to last?",
    truth: "4 seconds",
    aliases: [
      "4",
      "Four seconds"
    ],
    decoys: [
      "2 seconds",
      "6 seconds",
      "8 seconds",
      "3 seconds"
    ]
  },
  {
    id: "031cabd401379aea",
    category: "tricky",
    question: "You light four candles, then blow out two. How many candles did you blow out?",
    truth: "Two",
    aliases: [
      "2"
    ],
    decoys: [
      "Four",
      "Zero",
      "One",
      "Three"
    ]
  },
  {
    id: "72ac1e612a22bbde",
    category: "tricky",
    question: "Three hens each lay one egg per day. How many eggs do they lay together in three days?",
    truth: "Nine",
    aliases: [
      "9"
    ],
    decoys: [
      "Three",
      "Six",
      "Twelve",
      "Twenty-seven"
    ]
  },
  {
    id: "c67eb36163f0524e",
    category: "tricky",
    question: "A dozen eggs minus a half-dozen eggs leaves how many eggs?",
    truth: "Six",
    aliases: [
      "6"
    ],
    decoys: [
      "Five",
      "Seven",
      "Eight",
      "Twelve"
    ]
  },
  {
    id: "2114e72f3ff9f4a9",
    category: "tricky",
    question: "How many equal sides does a scalene triangle have?",
    truth: "None",
    aliases: [
      "Zero",
      "0",
      "No equal sides"
    ],
    decoys: [
      "Two",
      "Three",
      "Four",
      "One pair"
    ]
  },
  {
    id: "3489d9d715f90be5",
    category: "tricky",
    question: "Can a triangle in a flat plane have two right angles?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes always",
      "Only if isosceles",
      "Only if very large",
      "Only if upside down"
    ]
  },
  {
    id: "af1f1f67ef265337",
    category: "tricky",
    question: "How many straight sides does a circle have?",
    truth: "Zero",
    aliases: [
      "0",
      "None"
    ],
    decoys: [
      "One",
      "Two",
      "Four",
      "Infinite straight sides"
    ]
  },
  {
    id: "103051db9678b6a6",
    category: "tricky",
    question: "Which shape has every point on its surface the same distance from its centre in three dimensions?",
    truth: "Sphere",
    aliases: [
      "A sphere"
    ],
    decoys: [
      "Circle",
      "Cube",
      "Cylinder",
      "Cone"
    ]
  },
  {
    id: "e354960946dec9bc",
    category: "tricky",
    question: "Which is colder: -10\xB0C or -2\xB0C?",
    truth: "-10\xB0C",
    aliases: [
      "-10",
      "Minus ten",
      "Minus ten degrees"
    ],
    decoys: [
      "-2\xB0C",
      "They are equal",
      "Neither is cold",
      "Both are zero"
    ]
  },
  {
    id: "5d3fc2d2f58217a6",
    category: "tricky",
    question: "What is the freezing point of pure water at standard atmospheric pressure in Celsius?",
    truth: "0\xB0C",
    aliases: [
      "0",
      "Zero",
      "Zero degrees"
    ],
    decoys: [
      "32\xB0C",
      "100\xB0C",
      "-32\xB0C",
      "4\xB0C"
    ]
  },
  {
    id: "942c53157c94b0e8",
    category: "tricky",
    question: "At what numerical temperature do Celsius and Fahrenheit readings agree?",
    truth: "-40",
    aliases: [
      "Minus forty",
      "-40 degrees"
    ],
    decoys: [
      "-32",
      "0",
      "32",
      "100"
    ]
  },
  {
    id: "b3bd3f20b1f36a58",
    category: "tricky",
    question: "Which temperature scale starts at absolute zero?",
    truth: "Kelvin",
    aliases: [],
    decoys: [
      "Celsius",
      "Fahrenheit",
      "Beaufort",
      "Richter"
    ]
  },
  {
    id: "5461e63c5fd52780",
    category: "tricky",
    question: "What does a light-year measure?",
    truth: "Distance",
    aliases: [
      "Length"
    ],
    decoys: [
      "Time",
      "Speed",
      "Brightness",
      "Mass"
    ]
  },
  {
    id: "1f3800da4e623faf",
    category: "tricky",
    question: "Does sound travel through an ideal vacuum?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes faster than light",
      "Only high notes",
      "Only low notes",
      "Only music"
    ]
  },
  {
    id: "72f087057f592f44",
    category: "tricky",
    question: "What carries sound through air: moving matter over long distances or a travelling vibration?",
    truth: "A travelling vibration",
    aliases: [
      "Vibration",
      "Vibrations",
      "Pressure waves",
      "Sound waves"
    ],
    decoys: [
      "Long-distance airflow only",
      "Light rays",
      "Electrical current",
      "Nuclear reactions"
    ]
  },
  {
    id: "0432e70ac9c18abf",
    category: "tricky",
    question: "What chiefly causes Earth's seasons?",
    truth: "Axial tilt",
    aliases: [
      "Earth's axial tilt",
      "Tilt",
      "The tilt of Earth's axis"
    ],
    decoys: [
      "Distance from the Sun",
      "Moon phases",
      "Solar eclipses",
      "Ocean tides"
    ]
  },
  {
    id: "4cb93eb4173d584e",
    category: "tricky",
    question: "What primarily causes the regular phases of the Moon?",
    truth: "Its changing position relative to Earth and Sun",
    aliases: [
      "Changing Sun-Earth-Moon geometry",
      "Changing relative positions",
      "Sunlight on the Moon"
    ],
    decoys: [
      "Earth's shadow every night",
      "Clouds over the Moon",
      "The Moon changing shape",
      "The Sun changing shape"
    ]
  },
  {
    id: "7e8304992ab8d89e",
    category: "tricky",
    question: "During a lunar eclipse, whose shadow falls on the Moon?",
    truth: "Earth's",
    aliases: [
      "Earth",
      "Earth's shadow"
    ],
    decoys: [
      "The Sun's",
      "Venus's",
      "Mars's",
      "The Moon's own"
    ]
  },
  {
    id: "ad0d08c881c6b0b7",
    category: "tricky",
    question: "During a solar eclipse, what passes between Earth and the Sun?",
    truth: "The Moon",
    aliases: [
      "Moon"
    ],
    decoys: [
      "Mars",
      "Venus",
      "A comet",
      "Earth's shadow"
    ]
  },
  {
    id: "4be1b13b20274b32",
    category: "tricky",
    question: "What are shooting stars usually: stars or meteors?",
    truth: "Meteors",
    aliases: [
      "A meteor",
      "Meteor"
    ],
    decoys: [
      "Stars",
      "Planets",
      "Moons",
      "Galaxies"
    ]
  },
  {
    id: "b5a50c9463bea4b1",
    category: "tricky",
    question: "A meteorite is an object from space that reaches what?",
    truth: "The ground",
    aliases: [
      "Earth's surface",
      "Ground",
      "The Earth's surface"
    ],
    decoys: [
      "The Sun",
      "The Moon's orbit",
      "A cloud top",
      "The edge of the galaxy"
    ]
  },
  {
    id: "0a48ee9fc5d2d6c5",
    category: "tricky",
    question: "Which animal group do dolphins belong to, despite living in water?",
    truth: "Mammals",
    aliases: [
      "Mammal"
    ],
    decoys: [
      "Fish",
      "Reptiles",
      "Amphibians",
      "Birds"
    ]
  },
  {
    id: "b3ca0b062148363f",
    category: "tricky",
    question: "Which animal group do whales belong to, despite their fish-like shape?",
    truth: "Mammals",
    aliases: [
      "Mammal"
    ],
    decoys: [
      "Fish",
      "Reptiles",
      "Amphibians",
      "Molluscs"
    ]
  },
  {
    id: "2e0fecba24dcf767",
    category: "tricky",
    question: "Which animal group do bats belong to, despite having wings?",
    truth: "Mammals",
    aliases: [
      "Mammal"
    ],
    decoys: [
      "Birds",
      "Reptiles",
      "Insects",
      "Amphibians"
    ]
  },
  {
    id: "189a3285079f776d",
    category: "tricky",
    question: "Are all bats blind?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "Only when flying",
      "Only in daylight",
      "Only adults"
    ]
  },
  {
    id: "3df6b775fc4dcc77",
    category: "tricky",
    question: "What colour is normal human blood inside veins, before exposure to air?",
    truth: "Red",
    aliases: [
      "Dark red"
    ],
    decoys: [
      "Blue",
      "Green",
      "Purple",
      "Clear"
    ]
  },
  {
    id: "b96a7d6a436518e8",
    category: "tricky",
    question: "Is a tomato botanically a fruit or a root?",
    truth: "Fruit",
    aliases: [
      "A fruit"
    ],
    decoys: [
      "Root",
      "Stem",
      "Leaf",
      "Seed only"
    ]
  },
  {
    id: "365f94ba68f036a7",
    category: "tricky",
    question: "Is a cucumber botanically a fruit or a stem?",
    truth: "Fruit",
    aliases: [
      "A fruit"
    ],
    decoys: [
      "Stem",
      "Root",
      "Leaf",
      "Flower only"
    ]
  },
  {
    id: "28f77729e72e738b",
    category: "tricky",
    question: "Is a mushroom a plant or a fungus?",
    truth: "Fungus",
    aliases: [
      "A fungus",
      "Fungi"
    ],
    decoys: [
      "Plant",
      "Animal",
      "Mineral",
      "Bacterium"
    ]
  },
  {
    id: "af0e034317d030d6",
    category: "tricky",
    question: "Is a whale shark a whale or a fish?",
    truth: "Fish",
    aliases: [
      "A fish"
    ],
    decoys: [
      "Whale",
      "Reptile",
      "Amphibian",
      "Mollusc"
    ]
  },
  {
    id: "40eadb2c7f6f50c4",
    category: "tricky",
    question: "Is a starfish classified as a fish?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "Only young ones",
      "Only large ones",
      "Only in freshwater"
    ]
  },
  {
    id: "99c8c13fcaf2836d",
    category: "tricky",
    question: "Is a jellyfish classified as a fish?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "Only adult ones",
      "Only blue ones",
      "Only in salt water"
    ]
  },
  {
    id: "6f4f914425f049df",
    category: "tricky",
    question: "Is a cuttlefish classified as a fish or a mollusc?",
    truth: "Mollusc",
    aliases: [
      "Mollusk",
      "A mollusc",
      "A mollusk"
    ],
    decoys: [
      "Fish",
      "Reptile",
      "Crustacean",
      "Amphibian"
    ]
  },
  {
    id: "ba8cd756962de2ba",
    category: "tricky",
    question: "What kind of animal is a slow worm despite its name?",
    truth: "Lizard",
    aliases: [
      "A lizard",
      "Legless lizard"
    ],
    decoys: [
      "Worm",
      "Snake",
      "Slug",
      "Caterpillar"
    ]
  },
  {
    id: "a04a7f0954a13b9e",
    category: "tricky",
    question: "What kind of animal is a sea horse despite its horse-like name?",
    truth: "Fish",
    aliases: [
      "A fish"
    ],
    decoys: [
      "Mammal",
      "Reptile",
      "Crustacean",
      "Mollusc"
    ]
  },
  {
    id: "ec6c9ee60999e41b",
    category: "tricky",
    question: "Which part of a bullfight mainly attracts the bull's charge: the cloth's movement or its red colour?",
    truth: "Movement",
    aliases: [
      "The movement",
      "Cloth movement"
    ],
    decoys: [
      "Red colour",
      "The cloth's smell",
      "The cloth's weight",
      "The cloth's temperature"
    ]
  },
  {
    id: "988c9e11abdb4b78",
    category: "tricky",
    question: "Do humans normally use only ten percent of their brains?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "Only when awake",
      "Only as adults",
      "Only while studying"
    ]
  },
  {
    id: "aaf38466e8a93001",
    category: "tricky",
    question: "Do hair and fingernails keep actively growing after death?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes forever",
      "For seven years",
      "Only fingernails do",
      "Only hair does"
    ]
  },
  {
    id: "c75229360022fc43",
    category: "tricky",
    question: "Does chewing gum normally remain in the stomach for seven years?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "For ten years",
      "Only mint gum",
      "Only swallowed whole"
    ]
  },
  {
    id: "e3c7d12d105fe55a",
    category: "tricky",
    question: "Can lightning strike the same place more than once?",
    truth: "Yes",
    aliases: [],
    decoys: [
      "No",
      "Only once a century",
      "Only at sea",
      "Only in winter"
    ]
  },
  {
    id: "bb62dd27719e53bf",
    category: "tricky",
    question: "Does the Great Wall of China appear as an obvious naked-eye landmark from the Moon?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes always",
      "Only at sunrise",
      "Only in winter",
      "Only its towers"
    ]
  },
  {
    id: "22a294849b0301b2",
    category: "tricky",
    question: "Which direction does a compass's north-seeking end broadly indicate?",
    truth: "Magnetic north",
    aliases: [],
    decoys: [
      "True south",
      "The nearest city",
      "Geographic east",
      "The Sun"
    ]
  },
  {
    id: "99eb030b794d8191",
    category: "tricky",
    question: "What do camels mainly store in their humps?",
    truth: "Fat",
    aliases: [
      "Stored fat"
    ],
    decoys: [
      "Water",
      "Air",
      "Sand",
      "Protein crystals"
    ]
  },
  {
    id: "a0433f6d83dd2a41",
    category: "tricky",
    question: "Which is a true statement about ostriches when frightened?",
    truth: "They do not bury their heads in sand",
    aliases: [
      "They don't bury their heads",
      "Do not bury heads in sand"
    ],
    decoys: [
      "They always bury their heads",
      "They fly away",
      "They turn blue",
      "They hibernate instantly"
    ]
  },
  {
    id: "893dc016d7fe040b",
    category: "tricky",
    question: "What mostly causes ocean tides: the Moon's gravity or Earth's wind?",
    truth: "The Moon's gravity",
    aliases: [
      "Moon",
      "Lunar gravity",
      "The Moon"
    ],
    decoys: [
      "Earth's wind",
      "Rainfall",
      "Earthquakes",
      "Cloud cover"
    ]
  },
  {
    id: "303b97f4ecd3be9e",
    category: "tricky",
    question: "What happens to water's volume when it freezes into ordinary ice?",
    truth: "It increases",
    aliases: [
      "Expands",
      "It expands",
      "Increases"
    ],
    decoys: [
      "It decreases",
      "It stays exactly the same",
      "It becomes zero",
      "It becomes infinite"
    ]
  },
  {
    id: "0b17bfcc7c1a6c7a",
    category: "tricky",
    question: "Which is less dense: ordinary ice or liquid water near freezing?",
    truth: "Ice",
    aliases: [
      "Ordinary ice"
    ],
    decoys: [
      "Liquid water",
      "They are identical",
      "Neither has density",
      "Both are gases"
    ]
  },
  {
    id: "b0cc488597658511",
    category: "tricky",
    question: "In a vacuum, which hits the ground first when dropped together from the same height: a feather or a hammer?",
    truth: "They arrive together",
    aliases: [
      "Together",
      "At the same time",
      "Same time"
    ],
    decoys: [
      "The hammer",
      "The feather",
      "Neither falls",
      "The larger one"
    ]
  },
  {
    id: "f22a7fffc4ae955a",
    category: "tricky",
    question: "What is the main source of the Sun's energy?",
    truth: "Nuclear fusion",
    aliases: [
      "Fusion"
    ],
    decoys: [
      "Coal burning",
      "Nuclear fission",
      "Friction with space",
      "Chemical batteries"
    ]
  },
  {
    id: "52020975c541b4e3",
    category: "tricky",
    question: "Do the Moon's phases result from the Moon producing its own light?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "Only at full moon",
      "Only in winter",
      "Only during eclipses"
    ]
  },
  {
    id: "8d669e5b2f712d66",
    category: "tricky",
    question: "What do we see when we see moonlight?",
    truth: "Reflected sunlight",
    aliases: [
      "Sunlight reflected by the Moon",
      "Reflection of sunlight"
    ],
    decoys: [
      "The Moon burning",
      "Moon electricity",
      "Light from Earth's core",
      "Light created by lunar dust"
    ]
  },
  {
    id: "9c2b9a7d96787020",
    category: "tricky",
    question: "Which planet is hottest on average at its surface, even though it is not nearest the Sun?",
    truth: "Venus",
    aliases: [],
    decoys: [
      "Mercury",
      "Earth",
      "Mars",
      "Jupiter"
    ]
  },
  {
    id: "8efd077a8c0c31c9",
    category: "tricky",
    question: "Does a person's mass change simply because they travel from Earth to the Moon?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes, it becomes zero",
      "Yes, it doubles",
      "Yes, it becomes six times larger",
      "Yes, it vanishes slowly"
    ]
  },
  {
    id: "c303d48b714d3854",
    category: "tricky",
    question: "Which changes between Earth and the Moon for the same person: mass or weight?",
    truth: "Weight",
    aliases: [],
    decoys: [
      "Mass",
      "Both remain identical",
      "Neither exists on the Moon",
      "Height only"
    ]
  },
  {
    id: "2acf3f00927e3890",
    category: "tricky",
    question: "What is the centre of a hollow ring: material or empty space?",
    truth: "Empty space",
    aliases: [
      "A hole",
      "Space",
      "A hole in the middle"
    ],
    decoys: [
      "Solid material",
      "A heavier metal",
      "A hidden magnet",
      "A separate ring"
    ]
  },
  {
    id: "66e028b2e6342b84",
    category: "tricky",
    question: "What does the word biweekly mean in standard English: only one schedule or two possible schedules?",
    truth: "Two possible schedules",
    aliases: [
      "Twice a week or every two weeks",
      "Two meanings",
      "Two"
    ],
    decoys: [
      "Only twice daily",
      "Only twice yearly",
      "Only every three weeks",
      "Only once yearly"
    ]
  },
  {
    id: "ce9ce025644d0f79",
    category: "tricky",
    question: "If every square is a rectangle, is every rectangle necessarily a square?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "Only if blue",
      "Only if vertical",
      "Only on paper"
    ]
  },
  {
    id: "ded43de2e8cf983d",
    category: "tricky",
    question: "Can an equilateral triangle also be classified as isosceles under the inclusive definition of at least two equal sides?",
    truth: "Yes",
    aliases: [],
    decoys: [
      "No",
      "Only in three dimensions",
      "Only if upside down",
      "Only if right-angled"
    ]
  },
  {
    id: "730bc8e5a3966e32",
    category: "tricky",
    question: "A fair coin lands heads ten times in a row. What is the chance of heads on the next independent toss?",
    truth: "50%",
    aliases: [
      "One half",
      "1/2",
      "Fifty percent"
    ],
    decoys: [
      "0%",
      "10%",
      "90%",
      "100%"
    ]
  },
  {
    id: "3d9e58f4b541e783",
    category: "tricky",
    question: "Two fair coins are tossed independently. What is the probability that both land heads?",
    truth: "25%",
    aliases: [
      "One quarter",
      "1/4",
      "Twenty-five percent"
    ],
    decoys: [
      "50%",
      "75%",
      "100%",
      "0%"
    ]
  },
  {
    id: "9ea54489ee4171ae",
    category: "tricky",
    question: "A fair six-sided die has just rolled six. What is the chance of six on its next independent roll?",
    truth: "One in six",
    aliases: [
      "1/6",
      "A sixth"
    ],
    decoys: [
      "One in five",
      "One in twelve",
      "Zero",
      "One in thirty-six"
    ]
  },
  {
    id: "e919e899100100ff",
    category: "tricky",
    question: "How many queens are in a standard 52-card deck without jokers?",
    truth: "Four",
    aliases: [
      "4"
    ],
    decoys: [
      "Two",
      "Eight",
      "Twelve",
      "Sixteen"
    ]
  },
  {
    id: "2396fcfeeec23011",
    category: "tricky",
    question: "How many red cards are in a standard 52-card deck without jokers?",
    truth: "26",
    aliases: [
      "Twenty-six"
    ],
    decoys: [
      "13",
      "24",
      "28",
      "52"
    ]
  },
  {
    id: "c01195a3684e1b3f",
    category: "tricky",
    question: "Which is the largest desert by area, when polar deserts are included?",
    truth: "Antarctica",
    aliases: [
      "Antarctic desert",
      "The Antarctic desert"
    ],
    decoys: [
      "Sahara",
      "Gobi",
      "Arabian Desert",
      "Kalahari"
    ]
  },
  {
    id: "60392572e0fa1e53",
    category: "tricky",
    question: "Must a desert always be hot?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "Only in winter",
      "Only at night",
      "Only near the sea"
    ]
  },
  {
    id: "1c82de94d863cf55",
    category: "tricky",
    question: "Which is botanically NOT a true berry: grape, banana, tomato, or strawberry?",
    truth: "Strawberry",
    aliases: [
      "A strawberry"
    ],
    decoys: [
      "Grape",
      "Banana",
      "Tomato",
      "All are true berries"
    ]
  },
  {
    id: "263a3695af59151c",
    category: "tricky",
    question: "Does decaffeinated coffee necessarily contain absolutely no caffeine?",
    truth: "No",
    aliases: [],
    decoys: [
      "Yes",
      "Only if iced",
      "Only if black",
      "Only if instant"
    ]
  },
  {
    id: "25daaff1b4d9fcc7",
    category: "tricky",
    question: "Is glass at room temperature an ordinary slow-flowing liquid or an amorphous solid?",
    truth: "Amorphous solid",
    aliases: [
      "A solid",
      "Solid"
    ],
    decoys: [
      "Slow-flowing liquid",
      "Gas",
      "Plasma",
      "Crystalline metal"
    ]
  },
  {
    id: "d34400c8743ebcb1",
    category: "tricky",
    question: "In the expression 2 + 3 \xD7 4, using standard arithmetic precedence, what is the result?",
    truth: "14",
    aliases: [
      "Fourteen"
    ],
    decoys: [
      "20",
      "24",
      "18",
      "9"
    ]
  },
  {
    id: "c6439ed76555d36c",
    category: "tricky",
    question: "In the expression (2 + 3) \xD7 4, what is the result?",
    truth: "20",
    aliases: [
      "Twenty"
    ],
    decoys: [
      "14",
      "24",
      "18",
      "9"
    ]
  },
  {
    id: "ce0f97255af02f13",
    category: "general",
    question: "Which planet is closest to the Sun?",
    truth: "Mercury",
    aliases: [],
    decoys: [
      "Venus",
      "Earth",
      "Mars",
      "Jupiter"
    ]
  },
  {
    id: "13f4167e0ad93f9a",
    category: "general",
    question: "What is the largest planet in the solar system?",
    truth: "Jupiter",
    aliases: [],
    decoys: [
      "Saturn",
      "Neptune",
      "Earth",
      "Uranus"
    ]
  },
  {
    id: "f68cc1adea3286a6",
    category: "general",
    question: "What is the name of Earth's natural satellite?",
    truth: "The Moon",
    aliases: [
      "Moon",
      "Luna"
    ],
    decoys: [
      "Titan",
      "Europa",
      "Phobos",
      "Triton"
    ]
  },
  {
    id: "ac9f8e6e915c9bcc",
    category: "general",
    question: "Which galaxy contains our solar system?",
    truth: "Milky Way",
    aliases: [
      "The Milky Way",
      "Milky Way galaxy"
    ],
    decoys: [
      "Andromeda",
      "Triangulum",
      "Sombrero",
      "Whirlpool"
    ]
  },
  {
    id: "85d240add6d53208",
    category: "general",
    question: "Which star is closest to Earth?",
    truth: "The Sun",
    aliases: [
      "Sun",
      "Sol"
    ],
    decoys: [
      "Sirius",
      "Polaris",
      "Proxima Centauri",
      "Betelgeuse"
    ]
  },
  {
    id: "76cf2dc35a461200",
    category: "general",
    question: "What is the chemical symbol for gold?",
    truth: "Au",
    aliases: [],
    decoys: [
      "Ag",
      "Gd",
      "Go",
      "Gl"
    ]
  },
  {
    id: "534aee00f7d0ebb2",
    category: "general",
    question: "What is the chemical symbol for silver?",
    truth: "Ag",
    aliases: [],
    decoys: [
      "Au",
      "Si",
      "Sr",
      "Sg"
    ]
  },
  {
    id: "cc6d76a13dfd19d8",
    category: "general",
    question: "What is the chemical symbol for iron?",
    truth: "Fe",
    aliases: [],
    decoys: [
      "Ir",
      "In",
      "Io",
      "Fm"
    ]
  },
  {
    id: "984c3b0ea9d21e86",
    category: "general",
    question: "What is the chemical formula for water?",
    truth: "H2O",
    aliases: [],
    decoys: [
      "CO2",
      "O2",
      "H2O2",
      "NaCl"
    ]
  },
  {
    id: "71959b844c6a3f8d",
    category: "general",
    question: "Which gas makes up the largest proportion of Earth's atmosphere?",
    truth: "Nitrogen",
    aliases: [
      "N2"
    ],
    decoys: [
      "Oxygen",
      "Carbon dioxide",
      "Argon",
      "Hydrogen"
    ]
  },
  {
    id: "033d1262aa1734fe",
    category: "general",
    question: "Which gas do green plants absorb for photosynthesis?",
    truth: "Carbon dioxide",
    aliases: [
      "CO2"
    ],
    decoys: [
      "Oxygen",
      "Helium",
      "Hydrogen",
      "Neon"
    ]
  },
  {
    id: "4cc4ac002390a9d9",
    category: "general",
    question: "What green pigment helps plants absorb light for photosynthesis?",
    truth: "Chlorophyll",
    aliases: [],
    decoys: [
      "Melanin",
      "Haemoglobin",
      "Keratin",
      "Carotene"
    ]
  },
  {
    id: "f7aa90a4ed50ccc4",
    category: "general",
    question: "What is the hardest natural mineral on the Mohs scale?",
    truth: "Diamond",
    aliases: [
      "Diamonds"
    ],
    decoys: [
      "Quartz",
      "Ruby",
      "Topaz",
      "Talc"
    ]
  },
  {
    id: "d5fd7b5e8ced1729",
    category: "general",
    question: "Which organ pumps blood around the human body?",
    truth: "Heart",
    aliases: [
      "The heart"
    ],
    decoys: [
      "Liver",
      "Brain",
      "Kidney",
      "Lung"
    ]
  },
  {
    id: "b0af81aa73439069",
    category: "general",
    question: "Which human organ is primarily responsible for filtering blood to produce urine?",
    truth: "Kidney",
    aliases: [
      "Kidneys",
      "The kidneys",
      "The kidney"
    ],
    decoys: [
      "Liver",
      "Spleen",
      "Pancreas",
      "Stomach"
    ]
  },
  {
    id: "3d02ddeb0ace456a",
    category: "general",
    question: "Which blood cells carry most of the oxygen in human blood?",
    truth: "Red blood cells",
    aliases: [
      "Erythrocytes",
      "Red blood cell"
    ],
    decoys: [
      "White blood cells",
      "Platelets",
      "Stem cells",
      "Nerve cells"
    ]
  },
  {
    id: "d8c099971a19ad30",
    category: "general",
    question: "Which organ is the main control centre of the nervous system?",
    truth: "Brain",
    aliases: [
      "The brain"
    ],
    decoys: [
      "Heart",
      "Liver",
      "Spleen",
      "Pancreas"
    ]
  },
  {
    id: "f2605db1d9ee4073",
    category: "general",
    question: "What is the largest organ of the human body?",
    truth: "Skin",
    aliases: [
      "The skin"
    ],
    decoys: [
      "Liver",
      "Brain",
      "Lungs",
      "Small intestine"
    ]
  },
  {
    id: "ac5c00a41b9ddf26",
    category: "general",
    question: "How many bones are usually in an adult human skeleton?",
    truth: "206",
    aliases: [
      "Two hundred and six",
      "Two hundred six"
    ],
    decoys: [
      "201",
      "208",
      "212",
      "216"
    ]
  },
  {
    id: "ba8f5514fa7b36c9",
    category: "general",
    question: "What is the name of the pigment that contributes to skin colour?",
    truth: "Melanin",
    aliases: [],
    decoys: [
      "Chlorophyll",
      "Keratin",
      "Collagen",
      "Insulin"
    ]
  },
  {
    id: "e30b389c072cd1e2",
    category: "general",
    question: "What is the largest ocean on Earth?",
    truth: "Pacific Ocean",
    aliases: [
      "Pacific",
      "The Pacific Ocean"
    ],
    decoys: [
      "Atlantic Ocean",
      "Indian Ocean",
      "Arctic Ocean",
      "Southern Ocean"
    ]
  },
  {
    id: "0be10a641d9f2c7f",
    category: "general",
    question: "Which continent is home to the Sahara Desert?",
    truth: "Africa",
    aliases: [],
    decoys: [
      "Asia",
      "Australia",
      "Europe",
      "South America"
    ]
  },
  {
    id: "ec26dd1193cf363c",
    category: "general",
    question: "Which continent is home to the Amazon rainforest?",
    truth: "South America",
    aliases: [],
    decoys: [
      "North America",
      "Africa",
      "Asia",
      "Australia"
    ]
  },
  {
    id: "d5fe4ac7a938bed7",
    category: "general",
    question: "What is the capital of Japan?",
    truth: "Tokyo",
    aliases: [],
    decoys: [
      "Kyoto",
      "Osaka",
      "Seoul",
      "Beijing"
    ]
  },
  {
    id: "c990cc06e5e77570",
    category: "general",
    question: "What is the capital of France?",
    truth: "Paris",
    aliases: [],
    decoys: [
      "Lyon",
      "Marseille",
      "Nice",
      "Bordeaux"
    ]
  },
  {
    id: "89d30105f00dbb98",
    category: "general",
    question: "What is the capital of Italy?",
    truth: "Rome",
    aliases: [],
    decoys: [
      "Milan",
      "Venice",
      "Florence",
      "Naples"
    ]
  },
  {
    id: "577d017cce0357ec",
    category: "general",
    question: "What is the capital of Australia?",
    truth: "Canberra",
    aliases: [],
    decoys: [
      "Sydney",
      "Melbourne",
      "Perth",
      "Brisbane"
    ]
  },
  {
    id: "4f886a30804e1812",
    category: "general",
    question: "What is the capital of Canada?",
    truth: "Ottawa",
    aliases: [],
    decoys: [
      "Toronto",
      "Vancouver",
      "Montreal",
      "Quebec City"
    ]
  },
  {
    id: "ad888ae842ef53fc",
    category: "general",
    question: "What is the capital of India?",
    truth: "New Delhi",
    aliases: [],
    decoys: [
      "Mumbai",
      "Kolkata",
      "Chennai",
      "Hyderabad"
    ]
  },
  {
    id: "cbf22d5afbbd1628",
    category: "general",
    question: "What is the capital of Egypt?",
    truth: "Cairo",
    aliases: [],
    decoys: [
      "Alexandria",
      "Luxor",
      "Giza",
      "Aswan"
    ]
  },
  {
    id: "29e15395a08caea1",
    category: "general",
    question: "What is the main official language of Brazil?",
    truth: "Portuguese",
    aliases: [
      "Brazilian Portuguese"
    ],
    decoys: [
      "Spanish",
      "French",
      "Italian",
      "English"
    ]
  },
  {
    id: "c9222d4c0bd0da95",
    category: "general",
    question: "Which country contains the ancient city of Petra?",
    truth: "Jordan",
    aliases: [],
    decoys: [
      "Egypt",
      "Greece",
      "Turkey",
      "Lebanon"
    ]
  },
  {
    id: "1bbd66d3ff279aa7",
    category: "general",
    question: "Which country is home to the Taj Mahal?",
    truth: "India",
    aliases: [],
    decoys: [
      "Pakistan",
      "Bangladesh",
      "Nepal",
      "Iran"
    ]
  },
  {
    id: "847e7c86f8cccec6",
    category: "general",
    question: "Which country is home to the Great Pyramid of Giza?",
    truth: "Egypt",
    aliases: [],
    decoys: [
      "Jordan",
      "Greece",
      "Mexico",
      "Sudan"
    ]
  },
  {
    id: "793f372f9584f743",
    category: "general",
    question: "Which country is home to Machu Picchu?",
    truth: "Peru",
    aliases: [],
    decoys: [
      "Chile",
      "Bolivia",
      "Ecuador",
      "Colombia"
    ]
  },
  {
    id: "708950d97b439ae2",
    category: "general",
    question: "Which country is home to the city of Istanbul?",
    truth: "Turkey",
    aliases: [
      "T\xFCrkiye",
      "Turkiye"
    ],
    decoys: [
      "Greece",
      "Bulgaria",
      "Romania",
      "Georgia"
    ]
  },
  {
    id: "725fd5b0c4a18f4d",
    category: "general",
    question: "Which imaginary line divides Earth into northern and southern hemispheres?",
    truth: "Equator",
    aliases: [
      "The equator"
    ],
    decoys: [
      "Prime meridian",
      "Tropic of Cancer",
      "Arctic Circle",
      "Tropic of Capricorn"
    ]
  },
  {
    id: "78c30b606b6c779b",
    category: "general",
    question: "Which instrument measures atmospheric pressure?",
    truth: "Barometer",
    aliases: [],
    decoys: [
      "Hygrometer",
      "Anemometer",
      "Thermometer",
      "Seismometer"
    ]
  },
  {
    id: "98071dcedab49432",
    category: "general",
    question: "Which instrument measures wind speed?",
    truth: "Anemometer",
    aliases: [],
    decoys: [
      "Barometer",
      "Hygrometer",
      "Altimeter",
      "Voltmeter"
    ]
  },
  {
    id: "f76826d067a410c7",
    category: "general",
    question: "Which instrument measures temperature?",
    truth: "Thermometer",
    aliases: [],
    decoys: [
      "Barometer",
      "Anemometer",
      "Ammeter",
      "Hygrometer"
    ]
  },
  {
    id: "f9241e3616e50d06",
    category: "general",
    question: "Which instrument detects and records earthquake vibrations?",
    truth: "Seismograph",
    aliases: [
      "Seismometer"
    ],
    decoys: [
      "Spectrometer",
      "Barometer",
      "Oscilloscope",
      "Anemometer"
    ]
  },
  {
    id: "cc1eba533b1419a1",
    category: "general",
    question: "What is the unit of electrical resistance?",
    truth: "Ohm",
    aliases: [
      "Ohms"
    ],
    decoys: [
      "Volt",
      "Ampere",
      "Watt",
      "Joule"
    ]
  },
  {
    id: "c38f5a26bbdd3f7c",
    category: "general",
    question: "What is the SI unit of electric current?",
    truth: "Ampere",
    aliases: [
      "Amp",
      "Amperes",
      "Amps"
    ],
    decoys: [
      "Volt",
      "Ohm",
      "Watt",
      "Coulomb"
    ]
  },
  {
    id: "85cb498297cdd977",
    category: "general",
    question: "What is the SI unit of force?",
    truth: "Newton",
    aliases: [
      "Newtons"
    ],
    decoys: [
      "Joule",
      "Watt",
      "Pascal",
      "Volt"
    ]
  },
  {
    id: "731f35807021f9a1",
    category: "general",
    question: "What is the SI unit of energy?",
    truth: "Joule",
    aliases: [
      "Joules"
    ],
    decoys: [
      "Newton",
      "Watt",
      "Pascal",
      "Ampere"
    ]
  },
  {
    id: "b021e71b1fb0af6c",
    category: "general",
    question: "What is the SI unit of power?",
    truth: "Watt",
    aliases: [
      "Watts"
    ],
    decoys: [
      "Joule",
      "Newton",
      "Volt",
      "Ohm"
    ]
  },
  {
    id: "0404e1c4f0403b41",
    category: "general",
    question: "What force keeps planets in orbit around the Sun?",
    truth: "Gravity",
    aliases: [
      "Gravitation"
    ],
    decoys: [
      "Friction",
      "Buoyancy",
      "Elasticity",
      "Static electricity"
    ]
  },
  {
    id: "20437f8127b8f461",
    category: "general",
    question: "What is the process of a liquid turning into gas called?",
    truth: "Vaporization",
    aliases: [
      "Vaporisation",
      "Evaporation",
      "Boiling"
    ],
    decoys: [
      "Condensation",
      "Freezing",
      "Deposition",
      "Melting"
    ]
  },
  {
    id: "a0316cfa72c01808",
    category: "general",
    question: "What is the process of a gas turning into liquid called?",
    truth: "Condensation",
    aliases: [],
    decoys: [
      "Evaporation",
      "Sublimation",
      "Melting",
      "Freezing"
    ]
  },
  {
    id: "c76d2fbe15c54e9b",
    category: "general",
    question: "What is the process of a solid turning into liquid called?",
    truth: "Melting",
    aliases: [
      "Fusion"
    ],
    decoys: [
      "Freezing",
      "Condensation",
      "Deposition",
      "Sublimation"
    ]
  },
  {
    id: "346e14230afcac51",
    category: "general",
    question: "What is the scientific study of plants called?",
    truth: "Botany",
    aliases: [],
    decoys: [
      "Zoology",
      "Geology",
      "Astronomy",
      "Ecology"
    ]
  },
  {
    id: "98d80efdeb4eef70",
    category: "general",
    question: "What is the scientific study of animals called?",
    truth: "Zoology",
    aliases: [],
    decoys: [
      "Botany",
      "Geology",
      "Astronomy",
      "Meteorology"
    ]
  },
  {
    id: "35929c888390d40e",
    category: "general",
    question: "What is the scientific study of weather called?",
    truth: "Meteorology",
    aliases: [],
    decoys: [
      "Geology",
      "Astronomy",
      "Botany",
      "Oceanography"
    ]
  },
  {
    id: "a188d32dada29827",
    category: "general",
    question: "What is the scientific study of rocks and Earth's structure called?",
    truth: "Geology",
    aliases: [],
    decoys: [
      "Meteorology",
      "Zoology",
      "Botany",
      "Astronomy"
    ]
  },
  {
    id: "d9ff48dafa1fdaf9",
    category: "general",
    question: "What is the scientific study of stars and other celestial objects called?",
    truth: "Astronomy",
    aliases: [],
    decoys: [
      "Astrology",
      "Geology",
      "Meteorology",
      "Ecology"
    ]
  },
  {
    id: "d716e6d7e1ec096a",
    category: "general",
    question: "Which shape has six straight sides?",
    truth: "Hexagon",
    aliases: [
      "A hexagon"
    ],
    decoys: [
      "Pentagon",
      "Heptagon",
      "Octagon",
      "Nonagon"
    ]
  },
  {
    id: "d58e4d7660d1c86b",
    category: "general",
    question: "Which shape has eight straight sides?",
    truth: "Octagon",
    aliases: [
      "An octagon"
    ],
    decoys: [
      "Hexagon",
      "Heptagon",
      "Nonagon",
      "Decagon"
    ]
  },
  {
    id: "55a4df229cbea65c",
    category: "general",
    question: "How many degrees are in a right angle?",
    truth: "90",
    aliases: [
      "Ninety",
      "90 degrees"
    ],
    decoys: [
      "45",
      "60",
      "120",
      "180"
    ]
  },
  {
    id: "6a3fb369ab40417e",
    category: "general",
    question: "What is the smallest prime number?",
    truth: "Two",
    aliases: [
      "2"
    ],
    decoys: [
      "Zero",
      "One",
      "Three",
      "Negative one"
    ]
  },
  {
    id: "cce6588bb13548b8",
    category: "general",
    question: "What is the value of the Roman numeral X?",
    truth: "Ten",
    aliases: [
      "10"
    ],
    decoys: [
      "Five",
      "Fifty",
      "One hundred",
      "Five hundred"
    ]
  },
  {
    id: "fef55fb4fdb78691",
    category: "general",
    question: "What is the value of the Roman numeral L?",
    truth: "Fifty",
    aliases: [
      "50"
    ],
    decoys: [
      "Ten",
      "One hundred",
      "Five hundred",
      "One thousand"
    ]
  },
  {
    id: "3a4abcfe922e6e01",
    category: "general",
    question: "What is the value of the Roman numeral C?",
    truth: "One hundred",
    aliases: [
      "100"
    ],
    decoys: [
      "Ten",
      "Fifty",
      "Five hundred",
      "One thousand"
    ]
  },
  {
    id: "7598db3c94a0f540",
    category: "general",
    question: "What is the name of a triangle with three equal sides?",
    truth: "Equilateral",
    aliases: [
      "Equilateral triangle",
      "An equilateral triangle"
    ],
    decoys: [
      "Isosceles only",
      "Scalene",
      "Right-angled",
      "Obtuse"
    ]
  },
  {
    id: "ac389d7601aa663d",
    category: "general",
    question: "What is the longest side of a right triangle called?",
    truth: "Hypotenuse",
    aliases: [
      "The hypotenuse"
    ],
    decoys: [
      "Median",
      "Radius",
      "Diameter",
      "Apothem"
    ]
  },
  {
    id: "8e10c34a8f3b9bca",
    category: "general",
    question: "Which punctuation mark usually ends a direct question in English?",
    truth: "Question mark",
    aliases: [
      "A question mark"
    ],
    decoys: [
      "Comma",
      "Colon",
      "Semicolon",
      "Full stop"
    ]
  },
  {
    id: "9406ae7e495b9d9a",
    category: "general",
    question: "What is a word with the opposite meaning of another word called?",
    truth: "Antonym",
    aliases: [
      "An antonym"
    ],
    decoys: [
      "Synonym",
      "Homophone",
      "Acronym",
      "Palindrome"
    ]
  },
  {
    id: "debf70d999bd40de",
    category: "general",
    question: "What is a word with a similar meaning to another word called?",
    truth: "Synonym",
    aliases: [
      "A synonym"
    ],
    decoys: [
      "Antonym",
      "Homophone",
      "Acronym",
      "Anagram"
    ]
  },
  {
    id: "193329b7d971ccbd",
    category: "general",
    question: "What is a word made from the initial letters of several words, such as NASA, called?",
    truth: "Acronym",
    aliases: [
      "An acronym"
    ],
    decoys: [
      "Palindrome",
      "Homophone",
      "Anagram",
      "Antonym"
    ]
  },
  {
    id: "68d8085ab12951e5",
    category: "general",
    question: "What is a word that reads the same forwards and backwards, such as level, called?",
    truth: "Palindrome",
    aliases: [
      "A palindrome"
    ],
    decoys: [
      "Anagram",
      "Synonym",
      "Acronym",
      "Homonym"
    ]
  },
  {
    id: "4f7090d723afd56a",
    category: "general",
    question: "What is a rearrangement of a word's letters to make another word called?",
    truth: "Anagram",
    aliases: [
      "An anagram"
    ],
    decoys: [
      "Palindrome",
      "Acronym",
      "Synonym",
      "Antonym"
    ]
  },
  {
    id: "0dc71857843c7ffc",
    category: "general",
    question: "Who wrote the play Romeo and Juliet?",
    truth: "William Shakespeare",
    aliases: [
      "Shakespeare"
    ],
    decoys: [
      "Charles Dickens",
      "Jane Austen",
      "Mark Twain",
      "Oscar Wilde"
    ]
  },
  {
    id: "3400220dbf23ac56",
    category: "general",
    question: "Who wrote Pride and Prejudice?",
    truth: "Jane Austen",
    aliases: [
      "Austen"
    ],
    decoys: [
      "Charlotte Bronte",
      "Emily Bronte",
      "Mary Shelley",
      "George Eliot"
    ]
  },
  {
    id: "ff71484948e29ef9",
    category: "general",
    question: "Who wrote Frankenstein?",
    truth: "Mary Shelley",
    aliases: [
      "Shelley"
    ],
    decoys: [
      "Jane Austen",
      "Agatha Christie",
      "Virginia Woolf",
      "George Eliot"
    ]
  },
  {
    id: "1cbbb2b8fa577ed4",
    category: "general",
    question: "Who created the fictional detective Sherlock Holmes?",
    truth: "Arthur Conan Doyle",
    aliases: [
      "Conan Doyle",
      "Sir Arthur Conan Doyle"
    ],
    decoys: [
      "Agatha Christie",
      "Edgar Allan Poe",
      "Charles Dickens",
      "Wilkie Collins"
    ]
  },
  {
    id: "73c21ecfb89ad930",
    category: "general",
    question: "Who painted the Mona Lisa?",
    truth: "Leonardo da Vinci",
    aliases: [
      "Da Vinci",
      "Leonardo"
    ],
    decoys: [
      "Michelangelo",
      "Raphael",
      "Vincent van Gogh",
      "Claude Monet"
    ]
  },
  {
    id: "6763281523eb4163",
    category: "general",
    question: "Who painted The Starry Night in 1889?",
    truth: "Vincent van Gogh",
    aliases: [
      "Van Gogh"
    ],
    decoys: [
      "Claude Monet",
      "Pablo Picasso",
      "Salvador Dali",
      "Edvard Munch"
    ]
  },
  {
    id: "2d150df8a704cf07",
    category: "general",
    question: "Who composed The Four Seasons concertos?",
    truth: "Antonio Vivaldi",
    aliases: [
      "Vivaldi"
    ],
    decoys: [
      "Ludwig van Beethoven",
      "Johann Sebastian Bach",
      "Wolfgang Amadeus Mozart",
      "Frederic Chopin"
    ]
  },
  {
    id: "b285087f208ca358",
    category: "general",
    question: "Which musical instrument traditionally has 88 keys?",
    truth: "Piano",
    aliases: [
      "A piano",
      "Standard piano"
    ],
    decoys: [
      "Violin",
      "Flute",
      "Trumpet",
      "Clarinet"
    ]
  },
  {
    id: "50c450423694be9f",
    category: "general",
    question: "What is the highest-pitched member of the standard orchestral string family?",
    truth: "Violin",
    aliases: [
      "The violin"
    ],
    decoys: [
      "Viola",
      "Cello",
      "Double bass",
      "Contrabassoon"
    ]
  },
  {
    id: "a75dfde8077b61c0",
    category: "general",
    question: "Which instrument is played with a bow and is larger than a violin but smaller than a cello?",
    truth: "Viola",
    aliases: [
      "A viola"
    ],
    decoys: [
      "Double bass",
      "Mandolin",
      "Ukulele",
      "Harp"
    ]
  },
  {
    id: "d51e6c0ccb7f44a4",
    category: "general",
    question: "How many players per team are on the field in association football at the start of a standard match?",
    truth: "Eleven",
    aliases: [
      "11"
    ],
    decoys: [
      "Nine",
      "Ten",
      "Twelve",
      "Thirteen"
    ]
  },
  {
    id: "e07b0c10add97b2b",
    category: "general",
    question: "How many players per team are on the court in standard basketball?",
    truth: "Five",
    aliases: [
      "5"
    ],
    decoys: [
      "Four",
      "Six",
      "Seven",
      "Eight"
    ]
  },
  {
    id: "309d113d716947ff",
    category: "general",
    question: "What object is struck over a net in badminton?",
    truth: "Shuttlecock",
    aliases: [
      "Shuttle",
      "Birdie",
      "A shuttlecock"
    ],
    decoys: [
      "Puck",
      "Squash ball",
      "Disc",
      "Boule"
    ]
  },
  {
    id: "17ea64df1d5dcf92",
    category: "general",
    question: "Which sport uses the terms love, deuce, and advantage?",
    truth: "Tennis",
    aliases: [],
    decoys: [
      "Cricket",
      "Basketball",
      "Golf",
      "Hockey"
    ]
  },
  {
    id: "2c8edee85e9fa855",
    category: "general",
    question: "Which sport uses a puck on an ice rink?",
    truth: "Ice hockey",
    aliases: [
      "Hockey"
    ],
    decoys: [
      "Field hockey",
      "Lacrosse",
      "Curling",
      "Floorball"
    ]
  },
  {
    id: "a57dcd8c8590c737",
    category: "general",
    question: "In cricket, what is a score of zero by a dismissed batter commonly called?",
    truth: "Duck",
    aliases: [
      "A duck"
    ],
    decoys: [
      "Goose",
      "Swan",
      "Dove",
      "Pigeon"
    ]
  },
  {
    id: "be963e8a3e0e561d",
    category: "general",
    question: "What is the name of the chess piece that moves in an L shape?",
    truth: "Knight",
    aliases: [
      "The knight",
      "A knight"
    ],
    decoys: [
      "Bishop",
      "Rook",
      "Queen",
      "King"
    ]
  },
  {
    id: "97c71ac2df2b7298",
    category: "general",
    question: "Which chess piece moves diagonally any number of unobstructed squares?",
    truth: "Bishop",
    aliases: [
      "The bishop",
      "A bishop"
    ],
    decoys: [
      "Rook",
      "Knight",
      "King",
      "Pawn"
    ]
  },
  {
    id: "22a5be131ea955a2",
    category: "general",
    question: "Which chess piece moves horizontally or vertically any number of unobstructed squares?",
    truth: "Rook",
    aliases: [
      "The rook",
      "A rook",
      "Castle"
    ],
    decoys: [
      "Bishop",
      "Knight",
      "King",
      "Pawn"
    ]
  },
  {
    id: "433dd9605166053b",
    category: "general",
    question: "What is the common name for frozen water?",
    truth: "Ice",
    aliases: [],
    decoys: [
      "Steam",
      "Vapour",
      "Mist",
      "Dew"
    ]
  },
  {
    id: "7d4473545893fd56",
    category: "general",
    question: "What is the layer of gases surrounding Earth called?",
    truth: "Atmosphere",
    aliases: [
      "The atmosphere"
    ],
    decoys: [
      "Lithosphere",
      "Hydrosphere",
      "Biosphere",
      "Mantle"
    ]
  },
  {
    id: "9a584eab73abe884",
    category: "general",
    question: "Which layer is directly below Earth's crust?",
    truth: "Mantle",
    aliases: [
      "The mantle"
    ],
    decoys: [
      "Outer core",
      "Inner core",
      "Atmosphere",
      "Oceanic trench"
    ]
  },
  {
    id: "c08497001d6033c3",
    category: "general",
    question: "What is molten rock beneath Earth's surface called?",
    truth: "Magma",
    aliases: [],
    decoys: [
      "Lava",
      "Basalt",
      "Pumice",
      "Obsidian"
    ]
  },
  {
    id: "4ff6aa403c4e46c4",
    category: "general",
    question: "What is molten rock called after it reaches Earth's surface?",
    truth: "Lava",
    aliases: [],
    decoys: [
      "Magma",
      "Granite",
      "Slate",
      "Shale"
    ]
  },
  {
    id: "a39e0569d56929f0",
    category: "general",
    question: "What is the name for a mountain that can erupt molten rock?",
    truth: "Volcano",
    aliases: [
      "A volcano"
    ],
    decoys: [
      "Glacier",
      "Plateau",
      "Canyon",
      "Delta"
    ]
  },
  {
    id: "50f564fd1591257e",
    category: "general",
    question: "What is a large mass of ice that flows slowly over land called?",
    truth: "Glacier",
    aliases: [
      "A glacier"
    ],
    decoys: [
      "Iceberg",
      "Ice floe",
      "Snowdrift",
      "Hailstone"
    ]
  },
  {
    id: "517d1726baed8183",
    category: "general",
    question: "What is a floating mass of ice that has broken off a glacier called?",
    truth: "Iceberg",
    aliases: [
      "An iceberg"
    ],
    decoys: [
      "Glacier",
      "Snowdrift",
      "Hailstone",
      "Moraine"
    ]
  },
  {
    id: "e34d17745078f9f6",
    category: "general",
    question: "What is the main sugar transported in human blood commonly called?",
    truth: "Glucose",
    aliases: [],
    decoys: [
      "Lactose",
      "Sucrose",
      "Fructose",
      "Maltose"
    ]
  },
  {
    id: "2a04c73e780e7c81",
    category: "general",
    question: "What is the name for an animal that eats both plants and animals?",
    truth: "Omnivore",
    aliases: [
      "An omnivore"
    ],
    decoys: [
      "Herbivore",
      "Carnivore",
      "Insectivore",
      "Frugivore"
    ]
  },
  {
    id: "a5e3da3b076fbcc9",
    category: "general",
    question: "Which part of a flowering plant usually develops into the fruit after fertilization?",
    truth: "Ovary",
    aliases: [
      "The ovary"
    ],
    decoys: [
      "Petal",
      "Sepal",
      "Anther",
      "Stigma"
    ]
  },
  {
    id: "d0b9b9732646ba27",
    category: "riddle",
    question: "I have a spacebar and many keys, but I open no doors. What am I?",
    truth: "Keyboard",
    aliases: [
      "A keyboard",
      "Computer keyboard"
    ],
    decoys: [
      "Piano",
      "Typewriter ribbon",
      "Keyring",
      "Accordion"
    ]
  },
  {
    id: "cc35a960b833d05e",
    category: "riddle",
    question: "I have a face and two hands on a wall, but no arms or eyes. What am I?",
    truth: "Clock",
    aliases: [
      "A clock",
      "Wall clock",
      "Analog clock",
      "Analogue clock"
    ],
    decoys: [
      "Mirror",
      "Calendar",
      "Compass",
      "Thermometer"
    ]
  },
  {
    id: "3c74b9659ce3925b",
    category: "riddle",
    question: "I get wetter while drying your hands. What am I?",
    truth: "Towel",
    aliases: [
      "A towel"
    ],
    decoys: [
      "Sponge",
      "Soap",
      "Hairdryer",
      "Umbrella"
    ]
  },
  {
    id: "98bdf8d0c1af6bed",
    category: "riddle",
    question: "The more earth you remove from me, the bigger I become. What am I?",
    truth: "Hole",
    aliases: [
      "A hole"
    ],
    decoys: [
      "Hill",
      "Bucket",
      "Sandcastle",
      "Tunnel wall"
    ]
  },
  {
    id: "23278585a5f61d4c",
    category: "riddle",
    question: "I have a needle's eye but cannot see. What sewing tool am I?",
    truth: "Needle",
    aliases: [
      "A needle",
      "Sewing needle"
    ],
    decoys: [
      "Thimble",
      "Scissors",
      "Bobbin",
      "Spool"
    ]
  },
  {
    id: "73b06601646b13d6",
    category: "riddle",
    question: "I have many teeth but bite no food; I tidy your hair. What am I?",
    truth: "Comb",
    aliases: [
      "A comb"
    ],
    decoys: [
      "Brush handle",
      "Zipper",
      "Saw",
      "Fork"
    ]
  },
  {
    id: "aacdabafed689fc6",
    category: "riddle",
    question: "I have a neck but no head and hold your drink. What am I?",
    truth: "Bottle",
    aliases: [
      "A bottle"
    ],
    decoys: [
      "Mug",
      "Plate",
      "Bowl",
      "Saucer"
    ]
  },
  {
    id: "c04c6a601464d671",
    category: "riddle",
    question: "I have four legs and a flat top for dinner, but never walk. What am I?",
    truth: "Table",
    aliases: [
      "A table",
      "Dining table"
    ],
    decoys: [
      "Chair",
      "Stool",
      "Bed",
      "Cupboard"
    ]
  },
  {
    id: "faa434db45425f15",
    category: "riddle",
    question: "I have a thumb and four fingers but no bones. What am I?",
    truth: "Glove",
    aliases: [
      "A glove"
    ],
    decoys: [
      "Mitten",
      "Sock",
      "Boot",
      "Hat"
    ]
  },
  {
    id: "6573c959f7ce3860",
    category: "riddle",
    question: "I have branches, account holders, and money, but no leaves. What am I?",
    truth: "Bank",
    aliases: [
      "A bank"
    ],
    decoys: [
      "Library",
      "Forest",
      "School",
      "Post office"
    ]
  },
  {
    id: "ae9347435cbb4509",
    category: "riddle",
    question: "I show roads and cities, yet you cannot drive on me. What am I?",
    truth: "Map",
    aliases: [
      "A map",
      "Road map"
    ],
    decoys: [
      "Atlas moth",
      "Road sign",
      "Passport",
      "Compass"
    ]
  },
  {
    id: "f0e62e7ceef5e14b",
    category: "riddle",
    question: "I repeat your shout across a valley but have no mouth. What am I?",
    truth: "Echo",
    aliases: [
      "An echo"
    ],
    decoys: [
      "Wind",
      "Thunder",
      "Whistle",
      "Radio tower"
    ]
  },
  {
    id: "8a6d39413ef69a87",
    category: "riddle",
    question: "I follow you in sunlight and vanish when no light reaches you. What am I?",
    truth: "Shadow",
    aliases: [
      "A shadow",
      "Your shadow"
    ],
    decoys: [
      "Reflection",
      "Footprint",
      "Echo",
      "Silhouette drawing"
    ]
  },
  {
    id: "cf6e51a8bdf66075",
    category: "riddle",
    question: "I fill a room when a lamp turns on, yet take up no physical storage space. What am I?",
    truth: "Light",
    aliases: [],
    decoys: [
      "Furniture",
      "Fog",
      "Water",
      "Dust"
    ]
  },
  {
    id: "0a79bdd34c24ef38",
    category: "riddle",
    question: "I am broken as soon as someone speaks aloud in a silent room. What am I?",
    truth: "Silence",
    aliases: [],
    decoys: [
      "A promise",
      "A window",
      "A clock",
      "A mirror"
    ]
  },
  {
    id: "dbe23b482a091312",
    category: "riddle",
    question: "I am yours, but other people usually say me more than you do. What am I?",
    truth: "Your name",
    aliases: [
      "Name",
      "My name",
      "A name"
    ],
    decoys: [
      "Your password",
      "Your age",
      "Your address",
      "Your birthday"
    ]
  },
  {
    id: "7e59e31cdc4eaee1",
    category: "riddle",
    question: "I have pages, a spine, and a cover but no skeleton. What am I?",
    truth: "Book",
    aliases: [
      "A book"
    ],
    decoys: [
      "Newspaper",
      "Notebook ring",
      "Scroll",
      "Envelope"
    ]
  },
  {
    id: "0fd7ecf1a71e5f2f",
    category: "riddle",
    question: "I carry a mattress and have a headboard and footboard but no body. What am I?",
    truth: "Bed",
    aliases: [
      "A bed"
    ],
    decoys: [
      "Table",
      "Sofa",
      "Cupboard",
      "Bench"
    ]
  },
  {
    id: "5732bed98b7f8fed",
    category: "riddle",
    question: "I have an opening called a mouth and flow toward the sea. What am I?",
    truth: "River",
    aliases: [
      "A river"
    ],
    decoys: [
      "Cave",
      "Lake",
      "Well",
      "Glacier"
    ]
  },
  {
    id: "df626ef2fbf0ab2f",
    category: "riddle",
    question: "I carry a crown and eat sunlight through leaves, but rule no kingdom. What am I?",
    truth: "Tree",
    aliases: [
      "A tree"
    ],
    decoys: [
      "King",
      "Chess queen",
      "Mountain",
      "Castle"
    ]
  },
  {
    id: "8dfc5dc4b363b5d0",
    category: "riddle",
    question: "I rise from a chimney without climbing a ladder. What am I?",
    truth: "Smoke",
    aliases: [],
    decoys: [
      "Rain",
      "Snow",
      "Dew",
      "Frost"
    ]
  },
  {
    id: "1f984d89b8ad2445",
    category: "riddle",
    question: "I fall from clouds in drops, never needing a ladder down. What am I?",
    truth: "Rain",
    aliases: [],
    decoys: [
      "Fog",
      "Dew",
      "Mist",
      "Steam"
    ]
  },
  {
    id: "4dc38ebb6ac9c105",
    category: "riddle",
    question: "I can be cracked, whisked, and fried, and I come in a shell. What am I?",
    truth: "Egg",
    aliases: [
      "An egg"
    ],
    decoys: [
      "Nut",
      "Crab",
      "Oyster",
      "Coconut"
    ]
  },
  {
    id: "22849cabfb4e1270",
    category: "riddle",
    question: "I am a blackboard's writing partner that becomes shorter with use. What am I?",
    truth: "Chalk",
    aliases: [
      "A piece of chalk"
    ],
    decoys: [
      "Marker cap",
      "Eraser",
      "Ruler",
      "Duster handle"
    ]
  },
  {
    id: "de0523086dee2cbf",
    category: "riddle",
    question: "I become shorter while giving light from a burning wick. What am I?",
    truth: "Candle",
    aliases: [
      "A candle"
    ],
    decoys: [
      "Torch battery",
      "Light bulb",
      "Matchbox",
      "Lantern frame"
    ]
  },
  {
    id: "1ab66dde8a7a58b4",
    category: "riddle",
    question: "I wear away while removing pencil marks. What am I?",
    truth: "Eraser",
    aliases: [
      "An eraser",
      "Rubber",
      "A rubber"
    ],
    decoys: [
      "Sharpener",
      "Ruler",
      "Paperclip",
      "Crayon"
    ]
  },
  {
    id: "bf51c3fe9d1c6aaa",
    category: "riddle",
    question: "I travel in an envelope and sit in its upper corner to pay postage. What am I?",
    truth: "Stamp",
    aliases: [
      "A stamp",
      "Postage stamp"
    ],
    decoys: [
      "Postmark",
      "Address label",
      "Seal",
      "Paperclip"
    ]
  },
  {
    id: "18d17c6f2e27a515",
    category: "riddle",
    question: "I have a ring, receive calls, and fit in your pocket. What am I?",
    truth: "Phone",
    aliases: [
      "A phone",
      "Mobile phone",
      "Telephone",
      "Cellphone",
      "Smartphone"
    ],
    decoys: [
      "Bell",
      "Watch",
      "Keyring",
      "Radio"
    ]
  },
  {
    id: "c7fb37be800d80c1",
    category: "riddle",
    question: "I have a sole and a tongue but neither a foot nor a mouth of my own. What am I?",
    truth: "Shoe",
    aliases: [
      "A shoe"
    ],
    decoys: [
      "Sock",
      "Glove",
      "Hat",
      "Belt"
    ]
  },
  {
    id: "20bd57d96ac411f0",
    category: "riddle",
    question: "I have a head and a point and get hammered into wood. What am I?",
    truth: "Nail",
    aliases: [
      "A nail"
    ],
    decoys: [
      "Screwdriver",
      "Bolt",
      "Rivet gun",
      "Stapler"
    ]
  },
  {
    id: "d4c3f77bd1a953f2",
    category: "riddle",
    question: "I have a head on one side and tails on the other. What am I?",
    truth: "Coin",
    aliases: [
      "A coin"
    ],
    decoys: [
      "Dice",
      "Playing card",
      "Bottle cap",
      "Token ring"
    ]
  },
  {
    id: "1e12d306bf47a0ac",
    category: "riddle",
    question: "I have a handle and teeth, and I cut wood when moved back and forth. What am I?",
    truth: "Saw",
    aliases: [
      "A saw",
      "Handsaw",
      "Hand saw"
    ],
    decoys: [
      "Comb",
      "Rake",
      "Fork",
      "Chisel"
    ]
  },
  {
    id: "b3368c51328c437b",
    category: "riddle",
    question: "I have teeth that interlock to close your jacket. What am I?",
    truth: "Zipper",
    aliases: [
      "Zip",
      "A zipper",
      "A zip"
    ],
    decoys: [
      "Button",
      "Buckle",
      "Snap fastener",
      "Hook"
    ]
  },
  {
    id: "4fb3005449725b95",
    category: "riddle",
    question: "I have ribs but no bones and open above your head in the rain. What am I?",
    truth: "Umbrella",
    aliases: [
      "An umbrella"
    ],
    decoys: [
      "Tent",
      "Parasol stand",
      "Raincoat",
      "Awning pole"
    ]
  },
  {
    id: "e97541ddf0671cb9",
    category: "riddle",
    question: "I hold water despite being full of tiny holes and help wash dishes. What am I?",
    truth: "Sponge",
    aliases: [
      "A sponge"
    ],
    decoys: [
      "Colander",
      "Sieve",
      "Net",
      "Tea strainer"
    ]
  },
  {
    id: "f3f2c901c8da4922",
    category: "riddle",
    question: "I get wound up to tell time, but I never become annoyed. What am I?",
    truth: "Mechanical watch",
    aliases: [
      "Watch",
      "A watch",
      "Clock",
      "Mechanical clock"
    ],
    decoys: [
      "Digital thermometer",
      "Compass",
      "Calculator",
      "Calendar"
    ]
  },
  {
    id: "3116f4bfa00abdef",
    category: "riddle",
    question: "I have a bed and banks but never sleep or lend money. What am I?",
    truth: "River",
    aliases: [
      "A river"
    ],
    decoys: [
      "Bank vault",
      "Bedroom",
      "Hospital",
      "Library"
    ]
  },
  {
    id: "852e847ba4db1bd5",
    category: "riddle",
    question: "I have feet marked on my length but never wear shoes. What measuring tool am I?",
    truth: "Ruler",
    aliases: [
      "A ruler",
      "Measuring tape",
      "Tape measure",
      "Yardstick"
    ],
    decoys: [
      "Clock",
      "Scale",
      "Compass",
      "Protractor"
    ]
  },
  {
    id: "fd45c97294b41b0e",
    category: "riddle",
    question: "I show the date with numbered days and months but never keep an appointment myself. What am I?",
    truth: "Calendar",
    aliases: [
      "A calendar"
    ],
    decoys: [
      "Clock",
      "Compass",
      "Stopwatch",
      "Thermometer"
    ]
  },
  {
    id: "58d1494cb4ec92fe",
    category: "riddle",
    question: "I am a protective case for a pillow and share its first six letters. What am I?",
    truth: "Pillowcase",
    aliases: [
      "A pillowcase"
    ],
    decoys: [
      "Pillowtop",
      "Bedspread",
      "Duvet",
      "Cushion"
    ]
  },
  {
    id: "e29a74bb50d8862a",
    category: "riddle",
    question: "I have a dial, point north, and help lost hikers without giving spoken directions. What am I?",
    truth: "Compass",
    aliases: [
      "A compass"
    ],
    decoys: [
      "Clock",
      "Barometer",
      "Altimeter",
      "Thermometer"
    ]
  },
  {
    id: "2950c48765c5fee6",
    category: "riddle",
    question: "I swallow letters through a slot but never read them. What street-side object am I?",
    truth: "Postbox",
    aliases: [
      "Post box",
      "Letterbox",
      "Letter box",
      "Mailbox"
    ],
    decoys: [
      "Printer",
      "Shredder",
      "Mailbox key",
      "Telephone booth"
    ]
  },
  {
    id: "7c7bd11c86362996",
    category: "riddle",
    question: "I can hold a whole ocean on paper while remaining dry. What reference book am I?",
    truth: "Atlas",
    aliases: [
      "An atlas"
    ],
    decoys: [
      "Dictionary",
      "Novel",
      "Thesaurus",
      "Recipe book"
    ]
  },
  {
    id: "a7517f417919f24e",
    category: "riddle",
    question: "I am a room's glass copy of you, reversing the view as you look at me. What am I?",
    truth: "Mirror",
    aliases: [
      "A mirror"
    ],
    decoys: [
      "Window",
      "Painting",
      "Clock",
      "Photograph"
    ]
  },
  {
    id: "18c6667d7ddb58bc",
    category: "riddle",
    question: "I have wheels and carry your shopping in a supermarket, but no engine. What am I?",
    truth: "Shopping trolley",
    aliases: [
      "Shopping cart",
      "Trolley",
      "Cart",
      "A shopping trolley"
    ],
    decoys: [
      "Wheelchair",
      "Suitcase",
      "Pram",
      "Wheelbarrow"
    ]
  },
  {
    id: "9472142fac3ddf16",
    category: "riddle",
    question: "I am full of words and their meanings, arranged alphabetically. What am I?",
    truth: "Dictionary",
    aliases: [
      "A dictionary"
    ],
    decoys: [
      "Atlas",
      "Calendar",
      "Novel",
      "Ledger"
    ]
  },
  {
    id: "e0c7dbfed83e3481",
    category: "riddle",
    question: "I help you see distant stars with lenses or mirrors, but have no eyes. What am I?",
    truth: "Telescope",
    aliases: [
      "A telescope"
    ],
    decoys: [
      "Microscope",
      "Periscope",
      "Kaleidoscope",
      "Spectroscope"
    ]
  },
  {
    id: "3eb67a0297c5ff06",
    category: "riddle",
    question: "I enlarge tiny cells for your eyes using lenses. What am I?",
    truth: "Microscope",
    aliases: [
      "A microscope"
    ],
    decoys: [
      "Telescope",
      "Periscope",
      "Binoculars",
      "Compass"
    ]
  },
  {
    id: "af28cbb5a2d12bc8",
    category: "riddle",
    question: "I have a handle and a spout, and I pour your afternoon tea. What am I?",
    truth: "Teapot",
    aliases: [
      "A teapot"
    ],
    decoys: [
      "Saucepan",
      "Frying pan",
      "Colander",
      "Mug"
    ]
  },
  {
    id: "7e9cc57e410ade9e",
    category: "riddle",
    question: "I have strings and a soundboard, and you pluck me; I am a triangular orchestral instrument. What am I?",
    truth: "Harp",
    aliases: [
      "A harp"
    ],
    decoys: [
      "Violin",
      "Cello",
      "Clarinet",
      "Trumpet"
    ]
  },
  {
    id: "880aa64cf2c851a7",
    category: "riddle",
    question: "I have a large bell and valves, and a brass player blows into me. What am I if I play the highest standard trumpet-family part?",
    truth: "Trumpet",
    aliases: [
      "A trumpet"
    ],
    decoys: [
      "Tuba",
      "Trombone",
      "French horn",
      "Euphonium"
    ]
  },
  {
    id: "4f0436275d5841dd",
    category: "riddle",
    question: "I use light to take pictures but never remember a scene without storage. What am I?",
    truth: "Camera",
    aliases: [
      "A camera"
    ],
    decoys: [
      "Projector",
      "Telescope",
      "Scanner bed",
      "Microscope"
    ]
  },
  {
    id: "651920143127b148",
    category: "riddle",
    question: "I have pages of dates and you write your daily experiences in me. What am I?",
    truth: "Diary",
    aliases: [
      "A diary",
      "Journal",
      "A journal"
    ],
    decoys: [
      "Atlas",
      "Dictionary",
      "Menu",
      "Catalogue"
    ]
  },
  {
    id: "5155b3a3570397c9",
    category: "riddle",
    question: "I hold money and cards in your pocket but am not a bank. What am I?",
    truth: "Wallet",
    aliases: [
      "A wallet",
      "Purse",
      "A purse"
    ],
    decoys: [
      "Purse strap",
      "Envelope stamp",
      "Keyring",
      "Glove"
    ]
  },
  {
    id: "5d253940c9fdc309",
    category: "riddle",
    question: "I have a frame and wheels, and you pedal me to move. What am I?",
    truth: "Bicycle",
    aliases: [
      "Bike",
      "A bicycle",
      "A bike"
    ],
    decoys: [
      "Motorbike",
      "Scooter",
      "Skateboard",
      "Wheelchair"
    ]
  },
  {
    id: "39fdc7a7d4548f3e",
    category: "riddle",
    question: "I have a blade, a handle, and fold shut; I am carried for small cutting jobs. What am I?",
    truth: "Pocketknife",
    aliases: [
      "Pocket knife",
      "Penknife",
      "A pocketknife"
    ],
    decoys: [
      "Scissors",
      "Chisel",
      "Saw",
      "Razor cartridge"
    ]
  },
  {
    id: "520e49958538b6ab",
    category: "riddle",
    question: "I can be spoken in a play or cast with a fishing rod; what word names dialogue or fishing cord?",
    truth: "Line",
    aliases: [
      "A line"
    ],
    decoys: [
      "Hook",
      "Role",
      "Lead",
      "Net"
    ]
  },
  {
    id: "6b1d99a5b26c0a76",
    category: "riddle",
    question: "I am the circular part of a car that touches the road and is filled with air. What am I?",
    truth: "Tyre",
    aliases: [
      "Tire",
      "A tyre",
      "A tire"
    ],
    decoys: [
      "Rim",
      "Axle",
      "Hubcap",
      "Brake disc"
    ]
  },
  {
    id: "1e0b76af7d63c161",
    category: "riddle",
    question: "I turn with the wind to show its direction on a rooftop. What am I?",
    truth: "Weather vane",
    aliases: [
      "Wind vane",
      "Weathervane",
      "A weather vane"
    ],
    decoys: [
      "Anemometer",
      "Barometer",
      "Rain gauge",
      "Sundial"
    ]
  },
  {
    id: "b3cb16b4cedff845",
    category: "riddle",
    question: "I measure time with falling sand inside two glass bulbs. What am I?",
    truth: "Hourglass",
    aliases: [
      "An hourglass",
      "Sand timer"
    ],
    decoys: [
      "Sundial",
      "Stopwatch",
      "Pendulum",
      "Water clock"
    ]
  },
  {
    id: "8d939b541d89d8c3",
    category: "riddle",
    question: "Rearrange LISTEN to make a word meaning quiet or not speaking.",
    truth: "Silent",
    aliases: [],
    decoys: [
      "Tinsel",
      "Enlist",
      "Inlets",
      "Lentil"
    ]
  },
  {
    id: "2bdc4cc28f550c11",
    category: "riddle",
    question: "Rearrange EARTH to make the name of an organ that pumps blood.",
    truth: "Heart",
    aliases: [],
    decoys: [
      "Hater",
      "Heath",
      "Other",
      "There"
    ]
  },
  {
    id: "d87df9712ea318b3",
    category: "riddle",
    question: "Rearrange NIGHT to make a word meaning an object or item.",
    truth: "Thing",
    aliases: [],
    decoys: [
      "Light",
      "Might",
      "Ninth",
      "Thine"
    ]
  },
  {
    id: "baa90f6cc7105f2c",
    category: "riddle",
    question: "Rearrange ANGEL to make a word for the space between intersecting lines.",
    truth: "Angle",
    aliases: [],
    decoys: [
      "Glean",
      "Eagle",
      "Glare",
      "Agile"
    ]
  },
  {
    id: "00122ecd1fe70c81",
    category: "riddle",
    question: "Rearrange LEMON to make the name of a large round fruit.",
    truth: "Melon",
    aliases: [],
    decoys: [
      "Mango",
      "Olive",
      "Apple",
      "Peach"
    ]
  },
  {
    id: "8f7d55a86021f6f9",
    category: "riddle",
    question: "Rearrange DUSTY to make a verb meaning to learn from books.",
    truth: "Study",
    aliases: [],
    decoys: [
      "Dusts",
      "Stunt",
      "Trust",
      "Stays"
    ]
  },
  {
    id: "2560b67df19d8415",
    category: "riddle",
    question: "Rearrange BELOW to make the joint in the middle of an arm.",
    truth: "Elbow",
    aliases: [],
    decoys: [
      "Bowel",
      "Belowground",
      "Wobble",
      "Bellow"
    ]
  },
  {
    id: "bd4b841927a2a391",
    category: "riddle",
    question: "Rearrange SAVE to make a container for flowers.",
    truth: "Vase",
    aliases: [],
    decoys: [
      "Vast",
      "Veil",
      "Cave",
      "Case"
    ]
  },
  {
    id: "9cb6d34a438cc55e",
    category: "riddle",
    question: "Rearrange INCH to make the part of the face below the mouth.",
    truth: "Chin",
    aliases: [],
    decoys: [
      "Neck",
      "Cheek",
      "Nose",
      "Brow"
    ]
  },
  {
    id: "00653c04c4552c0d",
    category: "riddle",
    question: "Rearrange SPOT to make a word meaning halt.",
    truth: "Stop",
    aliases: [],
    decoys: [
      "Pots",
      "Tops",
      "Post",
      "Opts"
    ]
  },
  {
    id: "a8a0ac20c536fbc4",
    category: "riddle",
    question: "Rearrange TEAM to make a word for animal flesh eaten as food.",
    truth: "Meat",
    aliases: [],
    decoys: [
      "Mate",
      "Tame",
      "Meal",
      "Melt"
    ]
  },
  {
    id: "bfc980b3485d41fc",
    category: "riddle",
    question: "Rearrange ACHE to make a word meaning every one separately.",
    truth: "Each",
    aliases: [],
    decoys: [
      "Chew",
      "Chat",
      "Arch",
      "Echo"
    ]
  },
  {
    id: "4f54cc245206d506",
    category: "riddle",
    question: "Rearrange CARE to make a word for a speed competition.",
    truth: "Race",
    aliases: [],
    decoys: [
      "Acre",
      "Cart",
      "Cure",
      "Rake"
    ]
  },
  {
    id: "ef56a5a76bd01c64",
    category: "riddle",
    question: "Rearrange TRACE to make a verb meaning to respond.",
    truth: "React",
    aliases: [],
    decoys: [
      "Crate",
      "Cater",
      "Caret",
      "Carte"
    ]
  },
  {
    id: "92833891068742c6",
    category: "riddle",
    question: "Rearrange STALE to make the verb meaning to take something without permission.",
    truth: "Steal",
    aliases: [],
    decoys: [
      "Slate",
      "Least",
      "Tales",
      "Teals"
    ]
  },
  {
    id: "64e0cf6040d7c789",
    category: "riddle",
    question: "Rearrange THING to make the time between sunset and sunrise.",
    truth: "Night",
    aliases: [],
    decoys: [
      "Light",
      "Ninth",
      "Thine",
      "Tight"
    ]
  },
  {
    id: "a32ec268c5e9bae9",
    category: "riddle",
    question: "Rearrange BRAG to make a verb meaning to seize suddenly.",
    truth: "Grab",
    aliases: [],
    decoys: [
      "Garb",
      "Bargain",
      "Drag",
      "Grip"
    ]
  },
  {
    id: "f42430ad4be19f1e",
    category: "riddle",
    question: "Rearrange PEAR to make a verb meaning to harvest a crop.",
    truth: "Reap",
    aliases: [],
    decoys: [
      "Pare",
      "Ripe",
      "Peer",
      "Leap"
    ]
  },
  {
    id: "f4df8ad2e4903a31",
    category: "riddle",
    question: "Rearrange MALE to make a word for an occasion when food is eaten.",
    truth: "Meal",
    aliases: [],
    decoys: [
      "Lame",
      "Lime",
      "Malt",
      "Mall"
    ]
  },
  {
    id: "0e9afbddf9cc96dc",
    category: "riddle",
    question: "Rearrange PART to make a device used to catch something.",
    truth: "Trap",
    aliases: [],
    decoys: [
      "Tarp",
      "Rapt",
      "Prat",
      "Tart"
    ]
  },
  {
    id: "4740422ef0f53924",
    category: "riddle",
    question: "Rearrange STATE to make a word for one of the five traditional senses.",
    truth: "Taste",
    aliases: [],
    decoys: [
      "Teats",
      "Seats",
      "Stare",
      "Toast"
    ]
  },
  {
    id: "f8a946d8c785be30",
    category: "riddle",
    question: "Rearrange FILE to make the opposite of death.",
    truth: "Life",
    aliases: [],
    decoys: [
      "Lief",
      "Leaf",
      "Lift",
      "Lice"
    ]
  },
  {
    id: "a44522342127ae96",
    category: "riddle",
    question: "Rearrange VILE to make a word meaning morally bad.",
    truth: "Evil",
    aliases: [],
    decoys: [
      "Live",
      "Veil",
      "Vial",
      "Vale"
    ]
  },
  {
    id: "8d4f0fe7d830e08d",
    category: "riddle",
    question: "Rearrange SNAIL to make a word for small pointed metal fasteners.",
    truth: "Nails",
    aliases: [],
    decoys: [
      "Slain",
      "Lanes",
      "Snailhouse",
      "Snags"
    ]
  },
  {
    id: "becef38c90e90515",
    category: "riddle",
    question: "Rearrange BORED to make a word meaning dressed in a robe.",
    truth: "Robed",
    aliases: [],
    decoys: [
      "Boredom",
      "Broad",
      "Drove",
      "Bower"
    ]
  },
  {
    id: "bcdc587e6b49ca5c",
    category: "riddle",
    question: "Rearrange CHEAT to make a verb meaning to instruct.",
    truth: "Teach",
    aliases: [],
    decoys: [
      "Tache",
      "Hatch",
      "Reach",
      "Cheer"
    ]
  },
  {
    id: "89f9582523d19c72",
    category: "riddle",
    question: "Rearrange TONE to make a short written message.",
    truth: "Note",
    aliases: [],
    decoys: [
      "Torn",
      "Tons",
      "Tune",
      "None"
    ]
  },
  {
    id: "08624ea542bba090",
    category: "riddle",
    question: "Rearrange ACT to make a common household pet.",
    truth: "Cat",
    aliases: [],
    decoys: [
      "Dog",
      "Rat",
      "Bat",
      "Ant"
    ]
  },
  {
    id: "ab2c2cd4465a7c8a",
    category: "riddle",
    question: "Rearrange DOG to make the word for a deity.",
    truth: "God",
    aliases: [],
    decoys: [
      "Good",
      "Doge",
      "Gold",
      "Dug"
    ]
  },
  {
    id: "4a59147dba58e041",
    category: "riddle",
    question: "Rearrange ART to make a small long-tailed rodent.",
    truth: "Rat",
    aliases: [],
    decoys: [
      "Tar",
      "Bat",
      "Cat",
      "Ant"
    ]
  },
  {
    id: "8bd382d5747c2b9c",
    category: "riddle",
    question: "Rearrange WAR to make a word meaning uncooked.",
    truth: "Raw",
    aliases: [],
    decoys: [
      "Saw",
      "Rag",
      "Row",
      "Wry"
    ]
  },
  {
    id: "de2dd3eecc03d92f",
    category: "riddle",
    question: "Rearrange OPT to make the uppermost part of something.",
    truth: "Top",
    aliases: [],
    decoys: [
      "Pot",
      "Tip",
      "Tap",
      "Pet"
    ]
  },
  {
    id: "179555faef20eac1",
    category: "riddle",
    question: "Rearrange TEA to make the base-form verb meaning to consume food.",
    truth: "Eat",
    aliases: [],
    decoys: [
      "Tea",
      "Eta",
      "Tie",
      "Wet"
    ]
  },
  {
    id: "ad3fb09fb6482609",
    category: "riddle",
    question: "Rearrange POTS to make a word meaning a marked location.",
    truth: "Spot",
    aliases: [],
    decoys: [
      "Stop",
      "Tops",
      "Post",
      "Opts"
    ]
  },
  {
    id: "5ae9169647fb376c",
    category: "riddle",
    question: "Rearrange POST to make a word for cooking containers.",
    truth: "Pots",
    aliases: [],
    decoys: [
      "Spot",
      "Stop",
      "Tops",
      "Opts"
    ]
  },
  {
    id: "fc3bf842cb2a8bd4",
    category: "riddle",
    question: "Rearrange DEAR to make a verb meaning to interpret written words.",
    truth: "Read",
    aliases: [],
    decoys: [
      "Dare",
      "Drea",
      "Road",
      "Raid"
    ]
  },
  {
    id: "7e2bf666ca68fcff",
    category: "riddle",
    question: "Rearrange FLOW to make the name of a wild canine.",
    truth: "Wolf",
    aliases: [],
    decoys: [
      "Fowl",
      "Foal",
      "Flew",
      "Wool"
    ]
  },
  {
    id: "b24c65ed088e2af5",
    category: "riddle",
    question: "Rearrange SEAT to make a word meaning the direction opposite west.",
    truth: "East",
    aliases: [],
    decoys: [
      "Eats",
      "Teas",
      "Sate",
      "Etas"
    ]
  },
  {
    id: "d41cae1fd891a5fb",
    category: "riddle",
    question: "Rearrange HOSE to make something worn on a foot.",
    truth: "Shoe",
    aliases: [],
    decoys: [
      "Hoes",
      "Shed",
      "Sole",
      "Sock"
    ]
  },
  {
    id: "88c130777a36a4da",
    category: "riddle",
    question: "Rearrange DIAL to make a word meaning placed down, as in she ___ a book down.",
    truth: "Laid",
    aliases: [],
    decoys: [
      "Dali",
      "Lid",
      "Idly",
      "Dale"
    ]
  }
];

// questions.mjs
var questions_default2 = questions_default;

// engine.mjs
var norm = (s) => {
  const text = String(s).normalize("NFKC").replace(/[−–]/g, "-").trim().toLowerCase();
  return /^[-+]?\d/.test(text) ? text.replace(/[^\p{L}\p{N}./%+-]/gu, "") : text.replace(/[^\p{L}\p{N}]/gu, "");
};
var id = () => randomBytes(16).toString("hex");
var shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
var fail = (message) => {
  throw new Error(message);
};
var DEFAULT_SETTINGS = Object.freeze({ rounds: 5, bluffTime: 40, voteTime: 20, bots: 0 });
function validateSettings(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Choose valid game settings.");
  const s = { ...DEFAULT_SETTINGS, ...input };
  for (const [key, allowed] of Object.entries({ rounds: [3, 5, 7, 10], bluffTime: [20, 40, 60, 90], voteTime: [10, 20, 30, 45] })) if (!allowed.includes(s[key])) fail(`Invalid ${key} setting.`);
  if (!Number.isInteger(s.bots) || s.bots < 0 || s.bots > 7) fail("Choose between 0 and 7 computer players.");
  return { rounds: s.rounds, bluffTime: s.bluffTime, voteTime: s.voteTime, bots: s.bots };
}
var Game = class {
  constructor({ now = () => Date.now(), durations = { write: 4e4, vote: 2e4, reveal: 1e4, pause: 6e4 } } = {}) {
    this.rooms = /* @__PURE__ */ new Map();
    this.now = now;
    this.d = durations;
  }
  player(name) {
    name = String(name || "").trim();
    if (!name || name.length > 20) fail("Enter a name between 1 and 20 characters.");
    return { id: id(), token: id(), name, score: 0, lastSeen: this.now() };
  }
  settings(r) {
    return r.settings || { ...DEFAULT_SETTINGS };
  }
  setBots(r, count) {
    const humans = r.players.filter((p) => !p.bot);
    if (humans.length + count > 8) fail(`Only ${8 - humans.length} bot seats are available with ${humans.length} human players.`);
    const existing = r.players.filter((p) => p.bot).slice(0, count);
    r.players = [...humans, ...existing];
    let n = 1;
    while (r.players.filter((p) => p.bot).length < count) {
      let name;
      do {
        name = "Rumble Bot " + n++;
      } while (r.players.some((p) => p.name.toLowerCase() === name.toLowerCase()));
      r.players.push({ ...this.player(name), bot: true });
    }
  }
  create(name, settings = {}) {
    const p = this.player(name), s = validateSettings(settings);
    let code;
    do {
      code = Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[randomInt(32)]).join("");
    } while (this.rooms.has(code));
    const r = { code, players: [p], host: p.id, phase: "lobby", round: 0, settings: s, created: this.now(), updated: this.now() };
    this.setBots(r, s.bots);
    this.rooms.set(code, r);
    return { code, token: p.token };
  }
  join(code, name) {
    const r = this.room(code), p = this.player(name);
    if (r.players.length >= 8) fail("This room is full (8 players). Ask the host to reduce bots before joining.");
    if (r.players.some((x) => x.name.toLowerCase() === p.name.toLowerCase())) fail("That name is already taken.");
    p.waiting = !["lobby", "finished", "incomplete"].includes(r.phase);
    r.players.push(p);
    return { code: r.code, token: p.token };
  }
  room(code) {
    const r = this.rooms.get(String(code || "").toUpperCase());
    if (!r) fail("Room not found. Check the room code.");
    return r;
  }
  auth(r, token) {
    const p = r.players.find((p2) => p2.token === token && !p2.bot);
    if (!p) fail("Your seat could not be found. Join the room again.");
    return p;
  }
  online(p) {
    return !!p.bot || this.now() - p.lastSeen < 1e4;
  }
  active(r) {
    return r.players.filter((p) => r.roster?.includes(p.id));
  }
  canContinue(r) {
    const active = this.active(r).filter((p) => this.online(p));
    return active.length >= 2 && active.some((p) => !p.bot);
  }
  history(r) {
    if (!r.usedQuestionIds) {
      const oldDeck = r.deck || [];
      r.usedQuestionIds = questions_default2.filter((q) => oldDeck.some((old) => norm(old.question) === norm(q.question))).map((q) => q.id);
    }
    return new Set(r.usedQuestionIds);
  }
  available(r) {
    const used = this.history(r);
    return questions_default2.filter((q) => !used.has(q.id));
  }
  configure(r, p, input) {
    if (p.id !== r.host) fail("Only the host can change game settings.");
    if (!["lobby", "finished", "incomplete"].includes(r.phase)) fail("Settings are locked during a match.");
    const s = validateSettings(input);
    this.setBots(r, s.bots);
    r.settings = s;
    if (r.phase !== "lobby") {
      r.phase = "lobby";
      r.round = 0;
      r.roster = void 0;
      r.deck = [];
      r.matchSettings = void 0;
      r.submissions = {};
      r.votes = {};
      r.players.forEach((p2) => {
        p2.score = 0;
        p2.waiting = false;
      });
    }
  }
  start(r, p) {
    if (p.id !== r.host) fail("Only the host can start the game.");
    if (!["lobby", "finished", "incomplete"].includes(r.phase)) fail("A game is already running.");
    const players = r.players.filter((p2) => this.online(p2));
    if (players.length < 2) fail("At least 2 players are needed. Invite a friend or add a bot.");
    const settings = this.settings(r);
    let remaining = this.available(r);
    if (remaining.length < settings.rounds) fail(`Only ${remaining.length} unused questions remain. Choose fewer rounds, or reset question history when fewer than 3 remain.`);
    const deck = [];
    for (const category of shuffle(["funny", "tricky", "general", "riddle"])) {
      if (deck.length >= settings.rounds) break;
      const pool = remaining.filter((q) => q.category === category);
      if (pool.length) {
        const pick = shuffle(pool)[0];
        deck.push(pick);
        remaining = remaining.filter((q) => q.id !== pick.id);
      }
    }
    while (deck.length < settings.rounds) {
      const counts = remaining.reduce((a, q) => (a[q.category] = (a[q.category] || 0) + 1, a), {});
      const category = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      const pick = shuffle(remaining.filter((q) => q.category === category))[0];
      deck.push(pick);
      remaining = remaining.filter((q) => q.id !== pick.id);
    }
    r.players = players;
    players.forEach((p2) => {
      p2.score = 0;
      p2.waiting = false;
    });
    r.roster = players.map((p2) => p2.id);
    r.usedQuestionIds.push(...deck.map((q) => q.id));
    r.deck = shuffle(deck);
    r.matchSettings = { ...settings };
    r.round = 0;
    this.next(r);
  }
  resetQuestions(r, p) {
    if (p.id !== r.host) fail("Only the host can reset question history.");
    if (!["lobby", "finished", "incomplete"].includes(r.phase)) fail("Finish the current match before resetting.");
    if (this.available(r).length >= 3) fail("Unused questions are still available. Choose a shorter match.");
    r.usedQuestionIds = [];
  }
  duration(r, phase) {
    const s = r.matchSettings || this.settings(r);
    return phase === "write" ? this.d.write * s.bluffTime / 40 : this.d.vote * s.voteTime / 20;
  }
  scheduleBots(r, phase) {
    const span = this.duration(r, phase);
    r.botDue = {};
    for (const p of this.active(r).filter((p2) => p2.bot)) r.botDue[p.id] = this.now() + Math.max(1, Math.floor(span * (0.15 + randomInt(35) / 100)));
  }
  next(r) {
    r.round++;
    r.q = r.deck[r.round - 1];
    r.phase = "write";
    r.deadline = this.now() + this.duration(r, "write");
    r.submissions = {};
    r.votes = {};
    r.choices = {};
    r.results = null;
    this.scheduleBots(r, "write");
  }
  submit(r, p, text) {
    if (r.phase !== "write" || !r.roster.includes(p.id)) fail("The writing phase is closed.");
    if (r.submissions[p.id]) fail("Your answer is already locked.");
    text = String(text || "").trim().replace(/\s+/g, " ");
    if (text.length < 1 || text.length > 100 || !norm(text)) fail("Write an answer between 1 and 100 characters.");
    const correct = [r.q.truth, ...r.q.aliases].some((t) => norm(t) === norm(text));
    r.submissions[p.id] = { text, correct };
    this.tick(r);
  }
  ballot(r) {
    r.phase = "vote";
    r.deadline = this.now() + this.duration(r, "vote");
    const opts = [{ id: id(), text: r.q.truth, truth: true, authors: [] }];
    for (const p of this.active(r)) {
      const s = r.submissions[p.id];
      if (!s || s.correct) continue;
      let o = opts.find((o2) => norm(o2.text) === norm(s.text));
      if (!o) {
        o = { id: id(), text: s.text, authors: [] };
        opts.push(o);
      }
      o.authors.push(p.id);
    }
    const accepted = [r.q.truth, ...r.q.aliases].map(norm);
    const pool = shuffle(r.q.decoys.filter((d) => !accepted.includes(norm(d)) && !opts.some((o) => norm(o.text) === norm(d))));
    for (const p of this.active(r)) {
      let eligible = opts.filter((o) => !o.authors.includes(p.id));
      for (const text of pool) {
        if (eligible.length >= 4) break;
        let o = opts.find((o2) => !o2.truth && !o2.authors.length && norm(o2.text) === norm(text));
        if (!o) {
          o = { id: id(), text, authors: [] };
          opts.push(o);
        }
        if (!eligible.some((x) => x.id === o.id)) eligible.push(o);
      }
      r.choices[p.id] = shuffle(eligible).map((o) => o.id);
    }
    r.options = opts;
    this.scheduleBots(r, "vote");
  }
  vote(r, p, choice) {
    if (r.phase !== "vote" || !r.roster.includes(p.id)) fail("The voting phase is closed.");
    if (r.submissions[p.id]?.correct) fail("You already found the truth.");
    if (r.votes[p.id]) fail("Your vote is already locked.");
    if (!r.choices[p.id]?.includes(choice)) fail("Choose one of your available answers.");
    r.votes[p.id] = choice;
    this.tick(r);
  }
  botActions(r) {
    if (!["write", "vote"].includes(r.phase)) return;
    for (const p of this.active(r).filter((p2) => p2.bot)) {
      if (this.now() < (r.botDue?.[p.id] ?? Infinity)) continue;
      if (r.phase === "write" && !r.submissions[p.id]) {
        const used = Object.values(r.submissions).map((s) => norm(s.text));
        const pool = r.q.decoys.filter((d) => ![r.q.truth, ...r.q.aliases].some((a) => norm(a) === norm(d)));
        const fresh = pool.filter((d) => !used.includes(norm(d)));
        r.submissions[p.id] = { text: shuffle(fresh.length ? fresh : pool)[0], correct: false };
      } else if (r.phase === "vote" && !r.votes[p.id]) {
        const choices = r.choices[p.id] || [];
        if (choices.length) r.votes[p.id] = choices[randomInt(choices.length)];
      }
    }
  }
  reveal(r) {
    const gains = {};
    for (const p of this.active(r)) {
      gains[p.id] = { truth: 0, bluff: 0 };
      if (r.submissions[p.id]?.correct || r.options.find((o) => o.id === r.votes[p.id])?.truth) gains[p.id].truth = 1e3;
    }
    for (const [voter, choice] of Object.entries(r.votes)) {
      const o = r.options.find((o2) => o2.id === choice);
      for (const author of o?.authors || []) if (author !== voter) gains[author].bluff += 500;
    }
    for (const p of this.active(r)) p.score += gains[p.id].truth + gains[p.id].bluff;
    r.results = gains;
    r.phase = "reveal";
    r.deadline = this.now() + this.d.reveal;
  }
  tick(r) {
    const t = this.now();
    const connected = r.players.filter((p) => !p.bot && this.online(p));
    if (!connected.some((p) => p.id === r.host) && connected.length) r.host = connected[0].id;
    this.botActions(r);
    if (r.phase === "write" && (t >= r.deadline || this.active(r).every((p) => r.submissions[p.id]))) this.ballot(r);
    if (r.phase === "vote" && (t >= r.deadline || this.active(r).every((p) => r.votes[p.id] || r.submissions[p.id]?.correct))) this.reveal(r);
    if (r.phase === "reveal" && t >= r.deadline) {
      if (r.round === (r.matchSettings?.rounds || r.deck.length)) {
        r.phase = "finished";
        r.deadline = null;
      } else if (!this.canContinue(r)) {
        r.phase = "paused";
        r.deadline = t + this.d.pause;
      } else this.next(r);
    }
    if (r.phase === "paused") {
      if (this.canContinue(r)) this.next(r);
      else if (t >= r.deadline) {
        r.phase = "incomplete";
        r.deadline = null;
      }
    }
  }
  state(r, p) {
    this.tick(r);
    const isActive = r.roster?.includes(p.id);
    const reveal = ["reveal", "finished"].includes(r.phase);
    const settings = r.matchSettings && !["lobby", "finished", "incomplete"].includes(r.phase) ? r.matchSettings : this.settings(r);
    const s = { settings, questionBank: { total: questions_default2.length, remaining: this.available(r).length }, category: r.q?.category, code: r.code, me: p.id, host: r.host, phase: r.phase, round: r.round, totalRounds: r.deck?.length || settings.rounds, serverTime: this.now(), deadline: r.deadline, players: r.players.map((x) => ({ id: x.id, name: x.name, bot: !!x.bot, score: x.score, online: this.online(x), waiting: x.waiting || false, submitted: !!r.submissions?.[x.id], voted: !!r.votes?.[x.id] || !!r.submissions?.[x.id]?.correct })), spectator: !!r.roster && !isActive, question: r.q?.question, submitted: !!r.submissions?.[p.id], voted: !!r.votes?.[p.id], submission: r.submissions?.[p.id]?.text };
    if (r.phase === "vote" && isActive) {
      s.foundTruth = !!r.submissions[p.id]?.correct;
      s.options = (r.choices[p.id] || []).map((oid) => {
        const o = r.options.find((o2) => o2.id === oid);
        return { id: o.id, text: o.text };
      });
      s.myVote = r.votes[p.id];
    }
    if (reveal) {
      s.truth = r.q.truth;
      s.results = r.results;
      s.answers = r.options.map((o) => ({ text: o.text, truth: !!o.truth, authors: o.authors, voters: Object.entries(r.votes).filter(([, v]) => v === o.id).map(([pid]) => pid) }));
      s.winners = r.phase === "finished" ? this.active(r).filter((x) => x.score === Math.max(...this.active(r).map((x2) => x2.score))).map((x) => x.id) : [];
    }
    return s;
  }
  action({ action, code, token, name, text, choice, settings }) {
    if (action === "create") return this.create(name, settings);
    if (action === "join") return this.join(code, name);
    const r = this.room(code), p = this.auth(r, token);
    p.lastSeen = this.now();
    this.tick(r);
    if (action === "start") this.start(r, p);
    else if (action === "configure") this.configure(r, p, settings);
    else if (action === "resetQuestions") this.resetQuestions(r, p);
    else if (action === "submit") this.submit(r, p, text);
    else if (action === "vote") this.vote(r, p, choice);
    else if (action !== "state") fail("Unknown action.");
    r.updated = this.now();
    return this.state(r, p);
  }
};

// lib/function-service.mjs
var ACTIONS = /* @__PURE__ */ new Set(["create", "join", "state", "start", "configure", "submit", "vote", "resetQuestions"]);
var headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
var response = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
var fault = (message, status = 400) => Object.assign(new Error(message), { status });
var fingerprint = (body) => createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(body).filter(([key]) => key !== "requestId").sort(([a], [b]) => a.localeCompare(b))))).digest("hex");
var codeFor = (requestId, attempt) => {
  const bytes = createHash("sha256").update(requestId + ":" + attempt).digest();
  return Array.from(bytes.subarray(0, 6), (byte) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[byte % 32]).join("");
};
function replay(room, requestId, hash) {
  const record = room.receipts?.find((record2) => record2.id === requestId);
  if (!record) return null;
  if (record.hash !== hash) throw fault("Request identifier was already used for another action.", 409);
  return record.response;
}
function remember(room, requestId, hash, result) {
  room.receipts = [...(room.receipts || []).slice(-31), { id: requestId, hash, response: result }];
}
function catchUp(game2, room, now, setTime) {
  let steps = 0;
  while (["write", "vote", "reveal", "paused"].includes(room.phase) && steps++ < 100) {
    const events = [room.deadline];
    if (["write", "vote"].includes(room.phase)) for (const p of game2.active(room).filter((p2) => p2.bot)) {
      const done = room.phase === "write" ? room.submissions[p.id] : room.votes[p.id];
      if (!done && room.botDue?.[p.id] != null) events.push(room.botDue[p.id]);
    }
    const next = Math.min(...events.filter(Number.isFinite));
    if (next > now || !Number.isFinite(next)) break;
    setTime(next);
    game2.tick(room);
  }
  setTime(now);
  game2.tick(room);
}
function createGameHandler({ repository, now = () => Date.now(), durations, maxAttempts = 12 } = {}) {
  return async function handle(request) {
    if (request.method !== "POST") return response({ error: "Use POST for game requests." }, 405);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return response({ error: "Cross-origin requests are not allowed." }, 403);
    try {
      if (Number(request.headers.get("content-length") || 0) > 4096) throw fault("Request too large.", 413);
      const reader = request.body?.getReader();
      let size = 0, text = "";
      const decoder = new TextDecoder();
      if (reader) for (; ; ) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          throw fault("Request too large.", 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw fault("Send a valid JSON request.");
      }
      if (!body || typeof body !== "object" || Array.isArray(body) || !ACTIONS.has(body.action)) throw fault("Unknown game action.");
      const requestId = body.requestId || randomUUID();
      if (typeof requestId !== "string" || !/^[\w-]{16,80}$/.test(requestId)) throw fault("Invalid request identifier.");
      const hash = fingerprint(body);
      const timestamp = now();
      let collision = 0;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        let clock = timestamp;
        const game2 = new Game({ now: () => clock, ...durations ? { durations } : {} });
        let code, room, result, etag = null;
        if (body.action === "create") {
          code = codeFor(requestId, collision);
          const existing = await repository.read(code);
          if (existing) {
            const previous = replay(existing.room, requestId, hash);
            if (previous) return response(previous);
            collision++;
            continue;
          }
          result = game2.action(body);
          room = game2.room(result.code);
          room.code = code;
          result.code = code;
        } else {
          code = String(body.code || "").trim().toUpperCase();
          if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw fault("Room not found. Check the room code.");
          const stored = await repository.read(code);
          if (!stored || timestamp - stored.room.updated > 864e5) throw fault("Room not found. Check the room code.", 404);
          room = stored.room;
          etag = stored.etag;
          if (body.action !== "state") {
            const previous = replay(room, requestId, hash);
            if (previous) return response(previous);
          }
          game2.rooms.set(code, room);
          catchUp(game2, room, timestamp, (value) => {
            clock = value;
          });
          result = game2.action({ ...body, code });
        }
        room.updated = timestamp;
        if (body.action !== "state") remember(room, requestId, hash, result);
        if (await repository.write(code, room, etag)) return response(result);
        if (body.action !== "create") await new Promise((resolve) => setTimeout(resolve, Math.min(10 * (attempt + 1), 60)));
      }
      return response({ error: "Room is busy. Please retry your action." }, 409);
    } catch (error) {
      if (error.status || !error.name || error.name === "Error") return response({ error: error.status ? error.message : knownError(error.message) }, error.status || 400);
      return response({ error: "Room storage is temporarily unavailable. Please try again." }, 503);
    }
  };
}
function knownError(message) {
  const expected = ["Enter a name", "Invalid ", "Choose ", "Only ", "At least ", "This room", "That name", "Your ", "The writing", "The voting", "Write an answer", "Unknown ", "A game", "Settings ", "Finish ", "Unused ", "Room not found"];
  return expected.some((prefix) => String(message).startsWith(prefix)) ? message : "Room storage is temporarily unavailable. Please try again.";
}

// netlify/functions/game.ts
async function game(request) {
  try {
    return await createGameHandler({ repository: createBlobRepository() })(request);
  } catch {
    return Response.json({ error: "Room storage is temporarily unavailable. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export {
  game as default
};
