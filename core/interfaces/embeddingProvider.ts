/* 
    Interface for embedding providers
*/
export interface EmbeddingProvider { 
  embed(text: string): Promise<number[]>; // Method to generate embedding for given text
}
