/** Standard result envelope for all StinKit operations. */
export type StinKitResult<T> =
  | { status: 'success'; data: T;    meta: ResultMeta }
  | { status: 'partial'; data: T;    meta: ResultMeta; warnings: string[] }
  | { status: 'failed';  data: null; meta: ResultMeta; error: StinKitError }

export interface ResultMeta {
  completeness_pct:         number   // INV-002: local resolution rate (external calls excluded)
  duration_ms:              number
  graph_age_ms?:            number   // how old the graph index is
  external_calls_excluded?: number | undefined
  ambiguous_local_calls?:   number | undefined
}

export interface StinKitError {
  code:    ErrorCode
  message: string
  hint?:   string
}

export type ErrorCode =
  | 'GRAPH_NOT_FOUND'
  | 'GRAPH_CORRUPT'
  | 'GRAPH_STALE'
  | 'PARSE_FAILED'
  | 'AI_UNAVAILABLE'
  | 'AI_TIMEOUT'
  | 'AI_QUOTA_EXCEEDED'
  | 'CONFIG_INVALID'
  | 'FILE_NOT_FOUND'
  | 'UNSUPPORTED_LANGUAGE'
  | 'INTERNAL_ERROR'
