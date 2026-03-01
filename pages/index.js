import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const PREFIXES = ['ber', 'me', 'ke', 'per', 'ter', 'di', 'se'];
const PER_PAGE = 60;

export default function Home() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('prefix'); // prefix | exact
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { word, data, loading }
  const inputRef = useRef();

  const search = async (q = query, m = mode) => {
    if (!q.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);
    setPage(1);

    try {
      const type = m === 'exact' ? 'detail' : 'list';
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&type=${type}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal mengambil data');

      if (m === 'exact') {
        // For exact, show directly in modal
        setResults({ words: data.word ? [{ word: data.word }] : [], total: 1, query: q, source: data.source, sourceUrl: data.sourceUrl });
        setModal({ word: data.word || q, data, loading: false });
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickSearch = (q) => {
    setQuery(q);
    setMode('prefix');
    search(q, 'prefix');
  };

  const openModal = async (word) => {
    setModal({ word, data: null, loading: true });
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(word)}&type=detail`);
      const data = await res.json();
      setModal({ word, data, loading: false });
    } catch {
      setModal({ word, data: null, loading: false, error: 'Gagal memuat detail.' });
    }
  };

  const paged = results ? results.words.slice((page - 1) * PER_PAGE, page * PER_PAGE) : [];
  const totalPages = results ? Math.ceil(results.words.length / PER_PAGE) : 0;

  return (
    <>
      <Head>
        <title>KataCari — Pencari Kata KBBI</title>
        <meta name="description" content="Cari kata dalam Kamus Besar Bahasa Indonesia (KBBI) berdasarkan awalan huruf atau kata kunci." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="app">
        {/* Header */}
        <header>
          <div className="logo">Kata<span>Cari</span></div>
          <a href="https://kbbi.kemdikbud.go.id" target="_blank" rel="noopener" className="source-link">
            Sumber: KBBI Kemendikbud ↗
          </a>
        </header>

        {/* Hero */}
        <section className="hero">
          <h1>Temukan <em>setiap kata</em><br />dalam bahasa Indonesia</h1>
          <p>Ketik awalan huruf atau kata kunci. Data real-time dari KBBI Kemendikbud.</p>

          {/* Search Box */}
          <div className="search-box">
            <div className="mode-tabs">
              <button
                className={`mode-tab ${mode === 'prefix' ? 'active' : ''}`}
                onClick={() => setMode('prefix')}
              >
                Awalan
              </button>
              <button
                className={`mode-tab ${mode === 'exact' ? 'active' : ''}`}
                onClick={() => setMode('exact')}
              >
                Kata Tepat
              </button>
            </div>
            <div className="input-row">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && search()}
                placeholder={mode === 'prefix' ? 'contoh: ber, me, a, b, c...' : 'contoh: apel, buku, cinta...'}
                autoFocus
              />
              <button className="btn-search" onClick={() => search()} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Cari'}
              </button>
            </div>
          </div>

          {/* Quick access */}
          <div className="quick-access">
            <span className="label">Huruf →</span>
            {ALPHABET.map(l => (
              <button key={l} className="chip" onClick={() => quickSearch(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="quick-access" style={{ marginTop: '10px' }}>
            <span className="label">Awalan →</span>
            {PREFIXES.map(p => (
              <button key={p} className="chip chip-prefix" onClick={() => quickSearch(p)}>
                {p}-
              </button>
            ))}
          </div>
        </section>

        {/* Results */}
        <section className="results-section">
          {error && (
            <div className="state-error">
              <span>⚠️</span>
              <div>
                <strong>Terjadi kesalahan</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="loading-state">
              <div className="dots">
                <span /><span /><span />
              </div>
              <p>Mengambil data dari KBBI...</p>
            </div>
          )}

          {!loading && results && (
            <>
              <div className="results-header">
                <div className="results-meta">
                  <strong>{results.total.toLocaleString('id')}</strong> kata ditemukan untuk
                  <em> "{results.query}"</em>
                </div>
                <a href={results.sourceUrl} target="_blank" rel="noopener" className="source-badge">
                  kbbi.kemdikbud.go.id ↗
                </a>
              </div>

              {results.words.length === 0 ? (
                <div className="empty-state">
                  <span>📭</span>
                  <h3>Tidak ditemukan</h3>
                  <p>Kata dengan awalan "<strong>{results.query}</strong>" tidak ada dalam KBBI. Coba kata lain.</p>
                </div>
              ) : (
                <>
                  <div className="word-grid">
                    {paged.map((item, i) => (
                      <button
                        key={i}
                        className="word-card"
                        onClick={() => openModal(item.word || item.lema)}
                      >
                        <span className="word-text">{item.word || item.lema}</span>
                        {item.kelas && <span className="word-kelas">{item.kelas}</span>}
                      </button>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="page-btn">
                        ← Prev
                      </button>
                      <span className="page-info">
                        {page} / {totalPages}
                      </span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="page-btn">
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {!loading && !results && !error && (
            <div className="empty-state initial">
              <span>📖</span>
              <h3>Mulai mencari</h3>
              <p>Ketik huruf atau awalan kata di atas, lalu tekan <kbd>Enter</kbd> atau klik Cari.</p>
            </div>
          )}
        </section>
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-head">
              <h2 className="modal-title">{modal.word}</h2>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {modal.loading && (
                <div className="loading-state">
                  <div className="dots"><span /><span /><span /></div>
                  <p>Memuat definisi...</p>
                </div>
              )}
              {modal.error && <p className="error-text">{modal.error}</p>}
              {modal.data && !modal.loading && (
                <>
                  {modal.data.lema && modal.data.lema !== modal.word && (
                    <p className="modal-lema">Lema: <em>{modal.data.lema}</em></p>
                  )}
                  {modal.data.kataDasar && (
                    <p className="modal-dasar">Kata dasar: <strong>{modal.data.kataDasar}</strong></p>
                  )}

                  {modal.data.definitions && modal.data.definitions.length > 0 ? (
                    <ol className="def-list">
                      {modal.data.definitions.map((def, i) => (
                        <li key={i} className="def-item">
                          {def.kelas && <span className="def-kelas">{def.kelas}</span>}
                          <span className="def-text">{def.text}</span>
                          {def.contoh && <div className="def-contoh">→ {def.contoh}</div>}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="no-def">Definisi tidak tersedia. Lihat langsung di sumber.</p>
                  )}

                  <div className="modal-footer">
                    <a href={modal.data.sourceUrl || `https://kbbi.kemdikbud.go.id/entri/${encodeURIComponent(modal.word)}`} target="_blank" rel="noopener" className="view-source-btn">
                      Lihat di KBBI ↗
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: #0d0b09;
          color: #f0ead8;
          font-family: 'Georgia', 'Times New Roman', serif;
          min-height: 100vh;
        }
      `}</style>

      <style jsx>{`
        .app {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 20px;
        }

        /* Header */
        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0;
          border-bottom: 1px solid #2a2520;
        }

        .logo {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          font-family: Georgia, serif;
        }
        .logo span { color: #d4a84b; }

        .source-link {
          font-size: 0.75rem;
          color: #6b6050;
          text-decoration: none;
          font-family: monospace;
          letter-spacing: 0.03em;
        }
        .source-link:hover { color: #d4a84b; }

        /* Hero */
        .hero {
          padding: 64px 0 48px;
        }

        h1 {
          font-size: clamp(2.2rem, 5vw, 4rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin-bottom: 16px;
        }
        h1 em { font-style: italic; color: #d4a84b; }

        .hero > p {
          color: #7a6f60;
          font-size: 1rem;
          margin-bottom: 40px;
          font-family: -apple-system, sans-serif;
        }

        /* Search */
        .search-box {
          border: 1px solid #2a2520;
          background: #141210;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 20px;
          transition: border-color 0.2s;
        }
        .search-box:focus-within { border-color: #d4a84b; }

        .mode-tabs {
          display: flex;
          border-bottom: 1px solid #2a2520;
        }
        .mode-tab {
          flex: 1;
          background: transparent;
          border: none;
          color: #6b6050;
          padding: 10px;
          cursor: pointer;
          font-family: monospace;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          transition: all 0.15s;
        }
        .mode-tab.active { background: #d4a84b; color: #0d0b09; font-weight: 700; }
        .mode-tab:not(.active):hover { color: #f0ead8; }

        .input-row {
          display: flex;
        }
        input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 16px 20px;
          font-size: 1.05rem;
          color: #f0ead8;
          font-family: monospace;
          letter-spacing: 0.04em;
        }
        input::placeholder { color: #4a4338; }

        .btn-search {
          background: #d4a84b;
          color: #0d0b09;
          border: none;
          padding: 0 28px;
          font-family: monospace;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: background 0.15s;
          min-width: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .btn-search:hover:not(:disabled) { background: #e6ba5a; }
        .btn-search:disabled { opacity: 0.7; cursor: default; }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #0d0b09;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Quick access */
        .quick-access {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .label {
          font-family: monospace;
          font-size: 0.65rem;
          color: #4a4338;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-right: 4px;
        }
        .chip {
          background: transparent;
          border: 1px solid #2a2520;
          color: #6b6050;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          font-family: monospace;
          font-size: 0.72rem;
          transition: all 0.12s;
          letter-spacing: 0.05em;
        }
        .chip:hover { border-color: #d4a84b; color: #d4a84b; }
        .chip-prefix { color: #8a7a5a; }

        /* Results section */
        .results-section {
          padding-bottom: 80px;
        }

        .results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0 16px;
          border-bottom: 1px solid #2a2520;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 10px;
        }
        .results-meta {
          font-family: monospace;
          font-size: 0.85rem;
          color: #7a6f60;
        }
        .results-meta strong { color: #d4a84b; font-size: 1rem; }
        .results-meta em { color: #f0ead8; font-style: normal; }

        .source-badge {
          font-family: monospace;
          font-size: 0.65rem;
          color: #4a4338;
          text-decoration: none;
          border: 1px solid #2a2520;
          padding: 3px 10px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .source-badge:hover { color: #d4a84b; border-color: #d4a84b; }

        /* Word grid */
        .word-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 1px;
          background: #2a2520;
          border: 1px solid #2a2520;
          border-radius: 4px;
          overflow: hidden;
        }
        .word-card {
          background: #0d0b09;
          border: none;
          padding: 16px 18px;
          text-align: left;
          cursor: pointer;
          transition: background 0.12s;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .word-card:hover { background: #1a1710; }
        .word-text {
          font-family: Georgia, serif;
          font-size: 1rem;
          font-weight: 600;
          color: #f0ead8;
          line-height: 1.3;
        }
        .word-kelas {
          font-family: monospace;
          font-size: 0.6rem;
          color: #d4a84b;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Pagination */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 32px;
        }
        .page-btn {
          background: transparent;
          border: 1px solid #2a2520;
          color: #7a6f60;
          padding: 8px 18px;
          font-family: monospace;
          font-size: 0.8rem;
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.15s;
        }
        .page-btn:hover:not(:disabled) { border-color: #d4a84b; color: #d4a84b; }
        .page-btn:disabled { opacity: 0.3; cursor: default; }
        .page-info { font-family: monospace; font-size: 0.8rem; color: #4a4338; }

        /* States */
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 80px 0;
          color: #4a4338;
          font-family: monospace;
          font-size: 0.85rem;
        }
        .dots { display: flex; gap: 6px; }
        .dots span {
          width: 8px; height: 8px;
          background: #d4a84b;
          border-radius: 50%;
          animation: pulse 1s ease-in-out infinite;
        }
        .dots span:nth-child(2) { animation-delay: 0.15s; }
        .dots span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes pulse {
          0%, 100% { transform: scale(0.5); opacity: 0.3; }
          50% { transform: scale(1); opacity: 1; }
        }

        .empty-state {
          text-align: center;
          padding: 80px 20px;
        }
        .empty-state.initial { padding-top: 60px; }
        .empty-state span { display: block; font-size: 2.5rem; margin-bottom: 16px; }
        .empty-state h3 {
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #c0b090;
        }
        .empty-state p { color: #6b6050; font-size: 0.9rem; font-family: sans-serif; line-height: 1.6; }
        kbd {
          background: #2a2520;
          border: 1px solid #3a3020;
          padding: 1px 6px;
          border-radius: 3px;
          font-size: 0.8em;
        }

        .state-error {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          background: rgba(200,80,60,0.1);
          border: 1px solid rgba(200,80,60,0.3);
          padding: 20px 24px;
          border-radius: 4px;
          margin: 20px 0;
          font-family: sans-serif;
        }
        .state-error span { font-size: 1.5rem; flex-shrink: 0; }
        .state-error strong { display: block; margin-bottom: 4px; color: #e07060; }
        .state-error p { font-size: 0.85rem; color: #9a7a70; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(6px);
          z-index: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal {
          background: #141210;
          border: 1px solid #2a2520;
          border-radius: 6px;
          max-width: 580px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-head {
          padding: 24px 28px 20px;
          border-bottom: 1px solid #2a2520;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          position: sticky;
          top: 0;
          background: #141210;
        }
        .modal-title {
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #f0ead8;
        }
        .modal-close {
          background: transparent;
          border: 1px solid #2a2520;
          color: #6b6050;
          width: 32px;
          height: 32px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .modal-close:hover { color: #f0ead8; border-color: #6b6050; }

        .modal-body { padding: 24px 28px; }
        .modal-lema, .modal-dasar {
          font-family: sans-serif;
          font-size: 0.8rem;
          color: #6b6050;
          margin-bottom: 8px;
        }
        .modal-lema em { color: #d4a84b; font-style: italic; }
        .modal-dasar strong { color: #c0b090; }

        .def-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }
        .def-item {
          padding-left: 16px;
          border-left: 2px solid #2a2520;
          counter-increment: def;
        }
        .def-item:first-child { border-left-color: #d4a84b; }
        .def-kelas {
          display: inline-block;
          font-family: monospace;
          font-size: 0.65rem;
          color: #d4a84b;
          background: rgba(212,168,75,0.1);
          padding: 2px 7px;
          border-radius: 3px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .def-text {
          font-size: 0.95rem;
          color: #d0c8b8;
          line-height: 1.7;
          display: block;
          font-family: sans-serif;
        }
        .def-contoh {
          margin-top: 6px;
          font-size: 0.82rem;
          color: #6b6050;
          font-style: italic;
          font-family: sans-serif;
        }
        .no-def {
          color: #4a4338;
          font-size: 0.9rem;
          font-family: sans-serif;
          margin-top: 16px;
        }
        .error-text { color: #e07060; font-size: 0.9rem; font-family: sans-serif; }

        .modal-footer {
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #2a2520;
        }
        .view-source-btn {
          display: inline-flex;
          align-items: center;
          font-family: monospace;
          font-size: 0.75rem;
          color: #d4a84b;
          text-decoration: none;
          border: 1px solid rgba(212,168,75,0.3);
          padding: 7px 14px;
          border-radius: 3px;
          transition: all 0.15s;
          letter-spacing: 0.04em;
        }
        .view-source-btn:hover { background: rgba(212,168,75,0.1); }

        /* Responsive */
        @media (max-width: 600px) {
          .hero { padding: 40px 0 32px; }
          h1 { font-size: 2rem; }
          .word-grid { grid-template-columns: 1fr 1fr; }
          .modal-head { padding: 18px 20px; }
          .modal-body { padding: 18px 20px; }
          .modal-title { font-size: 1.4rem; }
        }
      `}</style>
    </>
  );
}
