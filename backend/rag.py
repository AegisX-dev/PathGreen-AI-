"""
PathGreen-AI: RAG Document Store

Indexes BS-VI regulations and Green Zone guidelines for LLM context retrieval.
"""

import os
from pathlib import Path
from typing import Optional

# Note: Full Pathway RAG integration requires pathway[all] and LLM xpack
# This is a simplified implementation for demo purposes

DATA_DIR = Path(__file__).parent / "data" / "regulations"


def load_regulation_documents() -> list[dict]:
    """
    Load all regulation documents from the data directory.
    Returns a list of document dicts with content and metadata.
    """
    documents = []
    
    if not DATA_DIR.exists():
        print(f"[RAG] Regulations directory not found: {DATA_DIR}")
        return documents
    
    for file_path in DATA_DIR.glob("*.md"):
        try:
            content = file_path.read_text(encoding="utf-8")
            documents.append({
                "id": file_path.stem,
                "filename": file_path.name,
                "content": content,
                "metadata": {
                    "source": str(file_path),
                    "type": "regulation",
                }
            })
            print(f"[RAG] Loaded: {file_path.name}")
        except Exception as e:
            print(f"[RAG] Error loading {file_path}: {e}")
    
    return documents


def chunk_document(doc: dict, chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """
    Split a document into overlapping chunks for embedding.
    
    Args:
        doc: Document dict with 'content' key
        chunk_size: Target characters per chunk
        overlap: Character overlap between chunks
    
    Returns:
        List of chunk dicts with content and metadata
    """
    content = doc["content"]
    chunks = []
    
    # Split by sections (## headers) first
    sections = content.split("\n## ")
    
    for i, section in enumerate(sections):
        if i > 0:
            section = "## " + section  # Restore header
        
        # If section is small enough, keep as one chunk
        if len(section) <= chunk_size:
            chunks.append({
                "id": f"{doc['id']}_chunk_{len(chunks)}",
                "content": section.strip(),
                "metadata": {
                    **doc["metadata"],
                    "chunk_index": len(chunks),
                    "document_id": doc["id"],
                }
            })
        else:
            # Split large sections by paragraphs
            paragraphs = section.split("\n\n")
            current_chunk = ""
            
            for para in paragraphs:
                if len(current_chunk) + len(para) <= chunk_size:
                    current_chunk += para + "\n\n"
                else:
                    if current_chunk:
                        chunks.append({
                            "id": f"{doc['id']}_chunk_{len(chunks)}",
                            "content": current_chunk.strip(),
                            "metadata": {
                                **doc["metadata"],
                                "chunk_index": len(chunks),
                                "document_id": doc["id"],
                            }
                        })
                    current_chunk = para + "\n\n"
            
            # Don't forget the last chunk
            if current_chunk.strip():
                chunks.append({
                    "id": f"{doc['id']}_chunk_{len(chunks)}",
                    "content": current_chunk.strip(),
                    "metadata": {
                        **doc["metadata"],
                        "chunk_index": len(chunks),
                        "document_id": doc["id"],
                    }
                })
    
    return chunks


def search_documents(query: str, documents: list[dict], top_k: int = 3) -> list[dict]:
    """
    Simple keyword-based search for relevant document chunks.
    In production, this would use Pathway's vector search with embeddings.
    
    Args:
        query: Search query
        documents: List of document chunks
        top_k: Number of results to return
    
    Returns:
        List of most relevant chunks
    """
    query_lower = query.lower()
    query_terms = set(query_lower.split())
    
    scored_docs = []
    
    for doc in documents:
        content_lower = doc["content"].lower()
        
        # Simple TF scoring
        score = 0
        for term in query_terms:
            score += content_lower.count(term)
        
        # Boost for exact phrase matches
        if query_lower in content_lower:
            score *= 2
        
        # Boost for key terms
        key_terms = ["idle", "emission", "bs-vi", "violation", "limit", "zone", "green"]
        for term in key_terms:
            if term in query_lower and term in content_lower:
                score += 5
        
        if score > 0:
            scored_docs.append((score, doc))
    
    # Sort by score descending
    scored_docs.sort(key=lambda x: x[0], reverse=True)
    
    return [doc for _, doc in scored_docs[:top_k]]


class RAGHandler:
    """
    Handler for RAG-based document retrieval and context augmentation.
    """
    
    def __init__(self):
        self.documents: list[dict] = []
        self.chunks: list[dict] = []
        self._initialized = False
    
    def initialize(self):
        """Load and index all regulation documents."""
        if self._initialized:
            return
        
        print("[RAG] Initializing document store...")
        
        # Load documents
        raw_docs = load_regulation_documents()
        self.documents = raw_docs
        
        # Chunk documents
        for doc in raw_docs:
            self.chunks.extend(chunk_document(doc))
        
        print(f"[RAG] Indexed {len(self.documents)} documents, {len(self.chunks)} chunks")
        self._initialized = True
    
    def get_context(self, query: str, max_chunks: int = 3) -> str:
        """
        Retrieve relevant context for an LLM query.
        
        Args:
            query: User's question
            max_chunks: Maximum number of context chunks to return
        
        Returns:
            Formatted context string for LLM prompt
        """
        if not self._initialized:
            self.initialize()
        
        relevant_chunks = search_documents(query, self.chunks, top_k=max_chunks)
        
        if not relevant_chunks:
            return "No relevant regulatory context found."
        
        context_parts = []
        for chunk in relevant_chunks:
            source = chunk["metadata"].get("document_id", "unknown")
            context_parts.append(f"[Source: {source}]\n{chunk['content']}")
        
        return "\n\n---\n\n".join(context_parts)
    
    def get_citations(self, query: str) -> list[str]:
        """Get citation references for a query."""
        if not self._initialized:
            self.initialize()
        
        relevant_chunks = search_documents(query, self.chunks, top_k=3)
        
        citations = set()
        for chunk in relevant_chunks:
            doc_id = chunk["metadata"].get("document_id", "unknown")
            citations.add(f"{doc_id.replace('_', ' ').title()}")
        
        return list(citations)


# Global instance
rag_handler = RAGHandler()
