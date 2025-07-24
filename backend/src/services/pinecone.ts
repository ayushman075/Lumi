import { Pinecone } from "@pinecone-database/pinecone";

const client = new Pinecone();
const index = client.Index("lumi-memory");

const storeVector = async(userId: string, text: string, vector: number[]) => {
  await index.namespace(userId).upsert([{
    id: `mem-${Date.now()}`,
    values: vector,
    metadata: { text }
  }]);
}

const searchMemory = async(userId: string, vector: number[]) => {
  const res = await index.namespace(userId).query({
    vector,
    topK: 5,
    includeMetadata: true
  });
  return res.matches?.map(m => m.metadata?.text) ?? [];
}

export{searchMemory,storeVector}