import { getClient } from "./elastic";
import type { ElasticDocument } from "./types";
import type { GraphNode, GraphEdge, GraphEdgeType, GraphData } from "./api";

const INDEX_NAME = "language_resources";
const MAX_FETCH = 1500;
const DEFAULT_MAX_NODES = 400;
const MAX_EDGES_RATIO = 2.5; // edges ≈ 2.5× nodes
const SIMILARITY_THRESHOLD = 0.6;
const RELATED_TERMS_K = 5;

// ---------------------------------------------------------------------------
// In-memory graph cache (TTL: 5 minutes)
// ---------------------------------------------------------------------------

const GRAPH_CACHE_TTL_MS = 5 * 60 * 1000;
const graphCache = new Map<string, { data: GraphData; timestamp: number }>();

function getCachedGraph(key: string): GraphData | undefined {
  const entry = graphCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > GRAPH_CACHE_TTL_MS) {
    graphCache.delete(key);
    return undefined;
  }
  return entry.data;
}

export function invalidateGraphCache(): void {
  graphCache.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// Generate graph data for D3 visualization
// ---------------------------------------------------------------------------

interface EntryWithEmbedding extends ElasticDocument {
  embedding?: number[];
}

export async function generateGraphData(
  cluster?: string,
  language_code?: string,
  maxNodes: number = DEFAULT_MAX_NODES
): Promise<GraphData> {
  const cacheKey = `full:${cluster || "all"}:${language_code || "all"}:${maxNodes}`;
  const cached = getCachedGraph(cacheKey);
  if (cached) return cached;

  const client = getClient();

  // Build query with optional cluster and language_code filters
  const langFilter = language_code ? [{ term: { language_code } }] : [];
  let query: Record<string, unknown>;
  if (cluster && cluster !== "all") {
    query = langFilter.length > 0
      ? { bool: { must: [{ term: { semantic_cluster: cluster } }], filter: langFilter } }
      : { term: { semantic_cluster: cluster } };
  } else {
    query = langFilter.length > 0
      ? { bool: { filter: langFilter } }
      : { match_all: {} };
  }

  const response = await client.search<EntryWithEmbedding>({
    index: INDEX_NAME,
    size: MAX_FETCH,
    _source: {
      includes: [
        "id",
        "headword_native",
        "headword_romanized",
        "semantic_cluster",
        "related_terms",
        "cross_references",
        "definitions",
        "embedding",
      ],
    },
    query,
  });

  const entries = response.hits.hits
    .map((hit) => hit._source)
    .filter((src): src is EntryWithEmbedding => src !== undefined);

  if (entries.length === 0) {
    return { nodes: [], edges: [] };
  }

  // --- Build lookup maps ---
  const headwordToId = new Map<string, string>();
  const idToEntry = new Map<string, EntryWithEmbedding>();
  for (const e of entries) {
    headwordToId.set(e.headword_native, e.id);
    idToEntry.set(e.id, e);
  }

  // --- Build edges ---
  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  function addEdge(sourceId: string, targetId: string, weight: number, type: GraphEdgeType) {
    if (sourceId === targetId) return;
    const key = [sourceId, targetId].sort().join(":");
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source: sourceId, target: targetId, weight, type });
  }

  // 1) related_terms edges
  for (const entry of entries) {
    if (!entry.related_terms) continue;
    for (const term of entry.related_terms) {
      const targetId = headwordToId.get(term);
      if (targetId) addEdge(entry.id, targetId, 1.0, "related_term");
    }
  }

  // 2) Semantic cluster star topology
  const clusterGroups = new Map<string, string[]>();
  for (const entry of entries) {
    const c = entry.semantic_cluster || "uncategorized";
    const group = clusterGroups.get(c) || [];
    group.push(entry.id);
    clusterGroups.set(c, group);
  }

  for (const [, ids] of clusterGroups) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length && i < 10; i++) {
      addEdge(ids[0], ids[i], 0.3, "cluster");
    }
  }

  // 3) Embedding similarity edges (> threshold)
  const withEmbeddings = entries.filter(
    (e): e is EntryWithEmbedding & { embedding: number[] } =>
      Array.isArray(e.embedding) && e.embedding.length > 0
  );

  for (let i = 0; i < withEmbeddings.length; i++) {
    for (let j = i + 1; j < withEmbeddings.length; j++) {
      const sim = cosineSimilarity(
        withEmbeddings[i].embedding,
        withEmbeddings[j].embedding
      );
      if (sim > SIMILARITY_THRESHOLD) {
        addEdge(withEmbeddings[i].id, withEmbeddings[j].id, sim, "embedding");
      }
    }
  }

  // --- Performance limiting: keep top N nodes by degree ---
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.source, (degree.get(edge.source) || 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) || 0) + 1);
  }

  // Include all entries (even isolated ones) so they can appear as nodes
  for (const entry of entries) {
    if (!degree.has(entry.id)) degree.set(entry.id, 0);
  }

  const totalEntries = degree.size;

  const sortedIds = [...degree.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxNodes)
    .map(([id]) => id);

  const keepIds = new Set(sortedIds);

  const nodes: GraphNode[] = sortedIds
    .map((id) => {
      const e = idToEntry.get(id)!;
      const enDef = e.definitions?.find((d) => d.language === "en");
      return {
        id: e.id,
        headword: e.headword_native,
        romanization: e.headword_romanized,
        cluster: e.semantic_cluster || "uncategorized",
        sourceCount: e.cross_references?.length || 0,
        definition: enDef?.text?.slice(0, 80) || undefined,
        degree: degree.get(e.id) || 0,
      };
    });

  const maxEdges = Math.round(maxNodes * MAX_EDGES_RATIO);
  const filteredEdges = edges
    .filter((e) => keepIds.has(e.source) && keepIds.has(e.target))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, maxEdges);

  const result: GraphData = { nodes, edges: filteredEdges, total: totalEntries };
  graphCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

// ---------------------------------------------------------------------------
// Generate neighborhood subgraph centered on a specific word
// ---------------------------------------------------------------------------

export async function generateNeighborhoodGraph(
  headword: string,
  depth = 2,
  maxNodes = 50,
  language_code?: string
): Promise<GraphData> {
  const cacheKey = `neighborhood:${headword}:${depth}:${language_code || "all"}`;
  const cached = getCachedGraph(cacheKey);
  if (cached) return cached;

  const client = getClient();
  const SOURCE_FIELDS = [
    "id",
    "headword_native",
    "headword_romanized",
    "semantic_cluster",
    "related_terms",
    "cross_references",
    "definitions",
    "embedding",
  ];
  const langFilter = language_code ? [{ term: { language_code } }] : [];

  // Step 1: Find the root entry
  const rootQuery = langFilter.length > 0
    ? { bool: { must: [{ term: { "headword_native.keyword": headword } }], filter: langFilter } }
    : { term: { "headword_native.keyword": headword } };

  const rootSearch = await client.search<EntryWithEmbedding>({
    index: INDEX_NAME,
    size: 1,
    _source: { includes: SOURCE_FIELDS },
    query: rootQuery,
  });

  if (!rootSearch.hits.hits[0]?._source) {
    return { nodes: [], edges: [] };
  }

  const rootEntry = rootSearch.hits.hits[0]._source;
  const collectedEntries = new Map<string, EntryWithEmbedding>();
  collectedEntries.set(rootEntry.id, rootEntry);

  // Step 2: BFS expansion via related_terms
  let frontier = [rootEntry];
  for (let d = 0; d < depth && frontier.length > 0; d++) {
    const relatedTerms = frontier
      .flatMap((e) => e.related_terms || [])
      .filter((term) => ![...collectedEntries.values()].some((e) => e.headword_native === term));

    if (relatedTerms.length === 0) break;

    const bfsQuery = langFilter.length > 0
      ? { bool: { must: [{ terms: { "headword_native.keyword": relatedTerms } }], filter: langFilter } }
      : { terms: { "headword_native.keyword": relatedTerms } };

    const nextSearch = await client.search<EntryWithEmbedding>({
      index: INDEX_NAME,
      size: maxNodes,
      _source: { includes: SOURCE_FIELDS },
      query: bfsQuery,
    });

    frontier = [];
    for (const hit of nextSearch.hits.hits) {
      if (hit._source && !collectedEntries.has(hit._source.id)) {
        collectedEntries.set(hit._source.id, hit._source);
        frontier.push(hit._source);
        if (collectedEntries.size >= maxNodes) break;
      }
    }
  }

  // Step 3: Fill remaining slots with kNN embedding similarity to root
  if (rootEntry.embedding && collectedEntries.size < maxNodes) {
    const knnSearch = await client.search<EntryWithEmbedding>({
      index: INDEX_NAME,
      size: maxNodes - collectedEntries.size,
      knn: {
        field: "embedding",
        query_vector: rootEntry.embedding,
        k: maxNodes - collectedEntries.size,
        num_candidates: 100,
        ...(langFilter.length > 0 ? { filter: langFilter } : {}),
      },
      _source: { includes: SOURCE_FIELDS },
    });

    for (const hit of knnSearch.hits.hits) {
      if (hit._source && !collectedEntries.has(hit._source.id)) {
        collectedEntries.set(hit._source.id, hit._source);
      }
    }
  }

  // Step 4: Build graph from collected entries (reuse edge logic)
  const entries = [...collectedEntries.values()];
  const headwordToId = new Map<string, string>();
  const idToEntry = new Map<string, EntryWithEmbedding>();
  for (const e of entries) {
    headwordToId.set(e.headword_native, e.id);
    idToEntry.set(e.id, e);
  }

  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  function addEdge(sourceId: string, targetId: string, weight: number, type: GraphEdgeType) {
    if (sourceId === targetId) return;
    const key = [sourceId, targetId].sort().join(":");
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source: sourceId, target: targetId, weight, type });
  }

  for (const entry of entries) {
    if (!entry.related_terms) continue;
    for (const term of entry.related_terms) {
      const targetId = headwordToId.get(term);
      if (targetId) addEdge(entry.id, targetId, 1.0, "related_term");
    }
  }

  const clusterGroups = new Map<string, string[]>();
  for (const entry of entries) {
    const c = entry.semantic_cluster || "uncategorized";
    const group = clusterGroups.get(c) || [];
    group.push(entry.id);
    clusterGroups.set(c, group);
  }
  for (const [, ids] of clusterGroups) {
    if (ids.length < 2) continue;
    for (let i = 1; i < ids.length && i < 10; i++) {
      addEdge(ids[0], ids[i], 0.3, "cluster");
    }
  }

  const withEmbeddings = entries.filter(
    (e): e is EntryWithEmbedding & { embedding: number[] } =>
      Array.isArray(e.embedding) && e.embedding.length > 0
  );
  for (let i = 0; i < withEmbeddings.length; i++) {
    for (let j = i + 1; j < withEmbeddings.length; j++) {
      const sim = cosineSimilarity(withEmbeddings[i].embedding, withEmbeddings[j].embedding);
      if (sim > SIMILARITY_THRESHOLD) {
        addEdge(withEmbeddings[i].id, withEmbeddings[j].id, sim, "embedding");
      }
    }
  }

  // Compute degree for each node
  const nodeDegree = new Map<string, number>();
  for (const edge of edges) {
    nodeDegree.set(edge.source, (nodeDegree.get(edge.source) || 0) + 1);
    nodeDegree.set(edge.target, (nodeDegree.get(edge.target) || 0) + 1);
  }

  const nodes: GraphNode[] = entries.map((e) => {
    const enDef = e.definitions?.find((d) => d.language === "en");
    return {
      id: e.id,
      headword: e.headword_native,
      romanization: e.headword_romanized,
      cluster: e.semantic_cluster || "uncategorized",
      sourceCount: e.cross_references?.length || 0,
      definition: enDef?.text?.slice(0, 80) || undefined,
      degree: nodeDegree.get(e.id) || 0,
    };
  });

  const result = { nodes, edges };
  graphCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

// ---------------------------------------------------------------------------
// Compute related_terms for entries that don't have them
// ---------------------------------------------------------------------------

export async function computeRelatedTerms(language_code?: string): Promise<{ updated: number }> {
  const client = getClient();

  // Fetch all entries with embeddings
  const allEntries: EntryWithEmbedding[] = [];
  let searchAfter: (string | number | null)[] | undefined;
  const baseQuery = language_code
    ? { term: { language_code } }
    : { match_all: {} };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await client.search<EntryWithEmbedding>({
      index: INDEX_NAME,
      size: 500,
      _source: {
        includes: ["id", "headword_native", "related_terms", "embedding"],
      },
      query: baseQuery,
      sort: [{ id: "asc" }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });

    const hits = response.hits.hits;
    if (hits.length === 0) break;

    for (const hit of hits) {
      if (hit._source) allEntries.push(hit._source);
    }

    searchAfter = hits[hits.length - 1].sort as (string | number | null)[];
  }

  console.log(`[graph] Loaded ${allEntries.length} entries for related terms computation`);

  // Filter to entries with embeddings
  const withEmbeddings = allEntries.filter(
    (e): e is EntryWithEmbedding & { embedding: number[] } =>
      Array.isArray(e.embedding) && e.embedding.length > 0
  );

  // Filter to entries needing related_terms
  const needsUpdate = withEmbeddings.filter(
    (e) => !e.related_terms || e.related_terms.length === 0
  );

  console.log(
    `[graph] ${needsUpdate.length}/${allEntries.length} entries need related terms`
  );

  if (needsUpdate.length === 0) return { updated: 0 };

  // Compute related terms using in-memory cosine similarity
  const updates: { id: string; related_terms: string[] }[] = [];

  for (let i = 0; i < needsUpdate.length; i++) {
    const entry = needsUpdate[i];

    const similarities: { headword: string; sim: number }[] = [];
    for (const other of withEmbeddings) {
      if (other.id === entry.id) continue;
      const sim = cosineSimilarity(entry.embedding, other.embedding);
      similarities.push({ headword: other.headword_native, sim });
    }

    similarities.sort((a, b) => b.sim - a.sim);
    const topK = similarities.slice(0, RELATED_TERMS_K).map((s) => s.headword);

    updates.push({ id: entry.id, related_terms: topK });

    if ((i + 1) % 50 === 0 || i === needsUpdate.length - 1) {
      console.log(
        `[graph] Computing related terms: ${i + 1}/${needsUpdate.length}`
      );
    }
  }

  // Bulk partial-update in Elastic
  const BATCH_SIZE = 200;
  let totalUpdated = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE);
    const operations = batch.flatMap((u) => [
      { update: { _index: INDEX_NAME, _id: u.id } },
      { doc: { related_terms: u.related_terms } },
    ]);

    const response = await client.bulk({
      refresh: i + BATCH_SIZE >= updates.length ? "wait_for" : false,
      operations,
    });

    const succeeded = response.items.filter(
      (item) => !item.update?.error
    ).length;
    totalUpdated += succeeded;

    if (response.errors) {
      const failed = response.items.filter((item) => item.update?.error);
      console.error(
        `[graph] Bulk update errors: ${failed.length}/${batch.length} failed`
      );
    }
  }

  console.log(`[graph] Updated related_terms on ${totalUpdated} entries`);
  return { updated: totalUpdated };
}
