"""
PathGreen-AI: Pathway RAG with Gemini

Real-time vector store for BS-VI regulations using Pathway LLM xpack.
Replaces keyword-based search with semantic vector search using Gemini embeddings.
"""

import os
import logging
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Check for required API key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set. RAG will use fallback mode.")

# Import Pathway components
try:
    import pathway as pw
    from pathway.udfs import ExponentialBackoffRetryStrategy
    from pathway.xpacks.llm import embedders, llms, parsers, splitters, prompts
    from pathway.xpacks.llm.vector_store import VectorStoreServer
    from pathway.xpacks.llm.question_answering import BaseRAGQuestionAnswerer
    PATHWAY_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Pathway LLM xpack not available: {e}")
    PATHWAY_AVAILABLE = False


# =============================================================================
# CONFIGURATION
# =============================================================================

DATA_DIR = Path(__file__).parent / "data" / "regulations"

# LLM Configuration
LLM_MODEL = "gemini/gemini-2.5-flash"
EMBEDDER_MODEL = "models/embedding-001"
RETRY_STRATEGY = None  # Will be initialized if Pathway available

# RAG Configuration
SEARCH_TOP_K = 3
MIN_TOKENS = 100
MAX_TOKENS = 400


# =============================================================================
# PATHWAY RAG COMPONENTS
# =============================================================================

def create_llm_chat():
    """Create LiteLLM chat instance for Gemini."""
    if not PATHWAY_AVAILABLE:
        return None
    
    global RETRY_STRATEGY
    RETRY_STRATEGY = ExponentialBackoffRetryStrategy(max_retries=6, backoff_factor=2.5)
    
    return llms.LiteLLMChat(
        model=LLM_MODEL,
        retry_strategy=RETRY_STRATEGY,
        temperature=0.2,
    )


def create_embedder():
    """Create Gemini embedder for vector search."""
    if not PATHWAY_AVAILABLE:
        return None
    
    return embedders.GeminiEmbedder(
        model=EMBEDDER_MODEL,
        retry_strategy=RETRY_STRATEGY or ExponentialBackoffRetryStrategy(max_retries=6, backoff_factor=2.5),
    )


def create_document_parser():
    """Create document parser for regulation files."""
    if not PATHWAY_AVAILABLE:
        return None
    
    return parsers.UnstructuredParser(chunking_mode="elements")


def create_text_splitter():
    """Create text splitter for chunking documents."""
    if not PATHWAY_AVAILABLE:
        return None
    
    return splitters.TokenCountSplitter(
        min_tokens=MIN_TOKENS,
        max_tokens=MAX_TOKENS,
    )


class PathwayRAGHandler:
    """
    Handler for Pathway-based RAG with Gemini.
    
    Creates a VectorStoreServer and BaseRAGQuestionAnswerer for
    semantic search and question answering on regulation documents.
    """
    
    def __init__(self):
        self.vector_store = None
        self.rag_app = None
        self.chat = None
        self._initialized = False
        self._server_running = False
    
    def initialize(self) -> bool:
        """
        Initialize the RAG pipeline.
        
        Returns:
            True if initialization successful, False otherwise.
        """
        if self._initialized:
            return True
        
        if not PATHWAY_AVAILABLE:
            logger.error("Pathway not available. Cannot initialize RAG.")
            return False
        
        if not GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY required for RAG.")
            return False
        
        try:
            logger.info(f"[RAG] Initializing Pathway RAG from {DATA_DIR}")
            
            # Create components
            self.chat = create_llm_chat()
            embedder = create_embedder()
            splitter = create_text_splitter()
            parser = create_document_parser()
            
            # Read regulation documents
            if not DATA_DIR.exists():
                logger.error(f"Data directory not found: {DATA_DIR}")
                return False
            
            docs = pw.io.fs.read(
                path=str(DATA_DIR),
                format="binary",
                with_metadata=True,
            )
            
            # Create Vector Store
            self.vector_store = VectorStoreServer(
                docs,
                embedder=embedder,
                splitter=splitter,
                parser=parser,
            )
            
            # Create RAG Question Answerer
            self.rag_app = BaseRAGQuestionAnswerer(
                llm=self.chat,
                indexer=self.vector_store,
                search_topk=SEARCH_TOP_K,
                short_prompt_template=prompts.prompt_qa,
            )
            
            self._initialized = True
            logger.info("[RAG] Pathway RAG initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"[RAG] Initialization failed: {e}")
            return False
    
    def build_server(self, host: str = "0.0.0.0", port: int = 8001):
        """
        Build the RAG HTTP server.
        
        Args:
            host: Server host address
            port: Server port
        """
        if not self._initialized:
            if not self.initialize():
                raise RuntimeError("Failed to initialize RAG")
        
        logger.info(f"[RAG] Building server on {host}:{port}")
        self.rag_app.build_server(host=host, port=port)
    
    def run_server(self):
        """Start the RAG server (blocking)."""
        if not self.rag_app:
            raise RuntimeError("Server not built. Call build_server first.")
        
        logger.info("[RAG] Starting RAG server...")
        self._server_running = True
        self.rag_app.run_server()
    
    def query(self, question: str) -> dict:
        """
        Query the RAG system directly (for testing).
        
        Args:
            question: User question
        
        Returns:
            Dict with answer and metadata
        """
        if not self._initialized:
            return {
                "answer": "RAG not initialized",
                "error": True
            }
        
        # Note: Direct queries work differently; typically use HTTP client
        return {
            "answer": "Use HTTP endpoint /v1/pw_ai_answer for queries",
            "endpoint": "http://localhost:8001/v1/pw_ai_answer",
        }


# =============================================================================
# FALLBACK: Simple Keyword Search (when Pathway unavailable)
# =============================================================================

class FallbackRAGHandler:
    """
    Fallback RAG using simple keyword search.
    Used when Pathway is not available or not configured.
    """
    
    def __init__(self):
        self.documents = []
        self.chunks = []
        self._initialized = False
    
    def initialize(self) -> bool:
        """Load and index regulation documents."""
        if self._initialized:
            return True
        
        try:
            if not DATA_DIR.exists():
                logger.warning(f"Data directory not found: {DATA_DIR}")
                return False
            
            for file_path in DATA_DIR.glob("*.md"):
                try:
                    content = file_path.read_text(encoding="utf-8")
                    doc = {
                        "id": file_path.stem,
                        "content": content,
                        "source": str(file_path),
                    }
                    self.documents.append(doc)
                    # Simple chunking by sections
                    self.chunks.extend(self._chunk_document(doc))
                except Exception as e:
                    logger.error(f"Error loading {file_path}: {e}")
            
            logger.info(f"[RAG-Fallback] Loaded {len(self.documents)} docs, {len(self.chunks)} chunks")
            self._initialized = True
            return True
            
        except Exception as e:
            logger.error(f"[RAG-Fallback] Init failed: {e}")
            return False
    
    def _chunk_document(self, doc: dict, chunk_size: int = 500) -> list[dict]:
        """Split document into chunks."""
        content = doc["content"]
        chunks = []
        
        sections = content.split("\n## ")
        for i, section in enumerate(sections):
            if i > 0:
                section = "## " + section
            
            if len(section) <= chunk_size:
                chunks.append({
                    "id": f"{doc['id']}_chunk_{len(chunks)}",
                    "content": section.strip(),
                    "source": doc["source"],
                })
            else:
                # Split by paragraphs
                paragraphs = section.split("\n\n")
                current = ""
                for para in paragraphs:
                    if len(current) + len(para) <= chunk_size:
                        current += para + "\n\n"
                    else:
                        if current:
                            chunks.append({
                                "id": f"{doc['id']}_chunk_{len(chunks)}",
                                "content": current.strip(),
                                "source": doc["source"],
                            })
                        current = para + "\n\n"
                if current.strip():
                    chunks.append({
                        "id": f"{doc['id']}_chunk_{len(chunks)}",
                        "content": current.strip(),
                        "source": doc["source"],
                    })
        
        return chunks
    
    def get_context(self, query: str, max_chunks: int = 3) -> str:
        """
        Retrieve relevant context using keyword matching.
        
        Args:
            query: User question
            max_chunks: Maximum chunks to return
        
        Returns:
            Formatted context string
        """
        if not self._initialized:
            self.initialize()
        
        if not self.chunks:
            return "No regulatory context available."
        
        query_lower = query.lower()
        query_terms = set(query_lower.split())
        
        scored = []
        for chunk in self.chunks:
            content_lower = chunk["content"].lower()
            score = sum(content_lower.count(term) for term in query_terms)
            
            # Boost key terms
            for term in ["idle", "emission", "bs-vi", "violation", "limit", "zone"]:
                if term in query_lower and term in content_lower:
                    score += 5
            
            if score > 0:
                scored.append((score, chunk))
        
        scored.sort(key=lambda x: x[0], reverse=True)
        top_chunks = [c for _, c in scored[:max_chunks]]
        
        if not top_chunks:
            return "No relevant regulatory context found."
        
        context_parts = []
        for chunk in top_chunks:
            source = Path(chunk["source"]).stem
            context_parts.append(f"[Source: {source}]\n{chunk['content']}")
        
        return "\n\n---\n\n".join(context_parts)
    
    def get_citations(self, query: str) -> list[str]:
        """Get citation sources for a query."""
        if not self._initialized:
            self.initialize()
        
        context = self.get_context(query)
        citations = set()
        
        for chunk in self.chunks[:3]:
            source = Path(chunk["source"]).stem
            citations.add(source.replace("_", " ").title())
        
        return list(citations)


# =============================================================================
# GLOBAL HANDLER (Auto-selects best available implementation)
# =============================================================================

def create_rag_handler():
    """
    Create the best available RAG handler.
    
    Returns PathwayRAGHandler if Pathway is available and configured,
    otherwise returns FallbackRAGHandler.
    """
    if PATHWAY_AVAILABLE and GEMINI_API_KEY:
        handler = PathwayRAGHandler()
        if handler.initialize():
            return handler
        logger.warning("Pathway RAG init failed, using fallback")
    
    return FallbackRAGHandler()


# Create global instance
rag_handler = create_rag_handler()

# Pathway-specific handler for server mode
pathway_rag = PathwayRAGHandler() if PATHWAY_AVAILABLE else None
