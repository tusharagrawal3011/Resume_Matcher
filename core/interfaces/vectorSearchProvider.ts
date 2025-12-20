export interface VectorSearchResult {
  id: string; // ID of the retrieved item
  score: number; // similarity score
}

/*
    Interface for vector search providers
*/
export interface VectorSearchProvider {
  search(
    vector: number[], // embedding vector to search with
    topK: number // number of top results to return
  ): Promise<VectorSearchResult[]>;
}
