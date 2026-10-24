CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_vectors (
  id VARCHAR(64) PRIMARY KEY,
  doc_id BIGINT NOT NULL,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (doc_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_ai_vectors_embedding
  ON ai_vectors USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_ai_vectors_doc_id ON ai_vectors (doc_id);
