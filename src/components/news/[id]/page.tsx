'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import { sanitizeHtml } from '@/lib/sanitize';
import {
  NEWS_SEED,
  NewsArticle,
  newsTagLabel,
} from '@/lib/newsStore';

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [articles, , loaded] = useLocalList<NewsArticle>(
    'ohome.news.v1',
    NEWS_SEED
  );

  const article = articles.find(item => item.id === id);

  const safeBodyHtml = useMemo(
    () => article ? sanitizeHtml(article.bodyHtml) : '',
    [article]
  );

  if (!loaded) {
    return (
      <main className="news-detail-page">
        <div className="news-message">LOADING...</div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="news-detail-page">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push('/news')}
        >
          ← NEWS
        </button>

        <div className="news-message">
          記事が見つかりません。
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  if (article.status !== 'published' && !isAdmin) {
    return (
      <main className="news-detail-page">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push('/news')}
        >
          ← NEWS
        </button>

        <div className="news-message">
          この記事は公開されていません。
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="news-detail-page">
      <button
        type="button"
        className="back-button"
        onClick={() => router.push('/news')}
      >
        ← NEWS
      </button>

      <article>
        <header className="article-header">
          <div className="article-meta">
            <time>{formatDate(article.date)}</time>

            <span className="article-tag">
              {newsTagLabel(article.tag)}
            </span>

            {isAdmin && article.status === 'draft' && (
              <span className="draft-badge">
                DRAFT
              </span>
            )}
          </div>

          <h1>{article.title || 'UNTITLED'}</h1>
        </header>

        <div
          className="article-body prose"
          dangerouslySetInnerHTML={{
            __html: safeBodyHtml,
          }}
        />
      </article>

      <footer className="article-footer">
        <button
          type="button"
          onClick={() => router.push('/news')}
        >
          ← BACK TO NEWS
        </button>
      </footer>

      <style jsx>{styles}</style>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.replaceAll('-', '.');
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
}

const styles = `
  .news-detail-page {
    width: min(100%, 920px);
    margin: 0 auto;
    padding: 64px 32px 100px;
    color: #f5f5f5;
  }

  .back-button {
    margin-bottom: 38px;
    padding: 0;
    border: 0;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    cursor: pointer;
  }

  .back-button:hover {
    color: #fff;
  }

  .article-header {
    padding-bottom: 34px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  }

  .article-meta {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }

  .article-meta time {
    color: rgba(255, 255, 255, 0.45);
    font-size: 10px;
    letter-spacing: 0.1em;
  }

  .article-tag {
    color: #aaaef2;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
  }

  .draft-badge {
    padding: 4px 7px;
    border: 1px solid rgba(128, 131, 214, 0.5);
    border-radius: 4px;
    color: #aaaef2;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .article-header h1 {
    margin: 0;
    color: #f7f7f9;
    font-size: clamp(28px, 5vw, 46px);
    line-height: 1.4;
    letter-spacing: 0.025em;
    overflow-wrap: anywhere;
  }

  .article-body {
    min-height: 220px;
    padding: 46px 4px 64px;
    color: rgba(248, 248, 250, 0.94);
    font-size: 15px;
    line-height: 2;
    overflow-wrap: anywhere;
  }

  .article-body :global(p) {
    margin: 0 0 1.5em;
  }

  .article-body :global(h2) {
    margin: 2.3em 0 0.9em;
    padding-bottom: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.18);
    color: #fff;
    font-size: 23px;
    line-height: 1.5;
  }

  .article-body :global(h3) {
    margin: 2em 0 0.8em;
    color: #fff;
    font-size: 18px;
    line-height: 1.5;
  }

  .article-body :global(ul),
  .article-body :global(ol) {
    margin: 1.2em 0;
    padding-left: 1.8em;
  }

  .article-body :global(li) {
    margin: 0.45em 0;
  }

  .article-body :global(blockquote) {
    margin: 1.8em 0;
    padding: 4px 0 4px 18px;
    border-left: 3px solid #8083d6;
    color: rgba(255, 255, 255, 0.72);
  }

  .article-body :global(hr) {
    margin: 42px 0;
    border: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
  }

  .article-body :global(img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 28px auto;
    border-radius: 4px;
  }

  .article-footer {
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.18);
  }

  .article-footer button {
    padding: 0;
    border: 0;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    cursor: pointer;
  }

  .article-footer button:hover {
    color: #fff;
  }

  .news-message {
    padding: 100px 0;
    color: rgba(255, 255, 255, 0.45);
    font-size: 11px;
    text-align: center;
  }

  @media (max-width: 700px) {
    .news-detail-page {
      padding: 40px 18px 80px;
    }

    .back-button {
      margin-bottom: 30px;
    }

    .article-header {
      padding-bottom: 26px;
    }

    .article-meta {
      flex-wrap: wrap;
      gap: 9px 12px;
      margin-bottom: 15px;
    }

    .article-header h1 {
      font-size: clamp(25px, 8vw, 34px);
    }

    .article-body {
      padding: 34px 2px 52px;
      font-size: 14px;
      line-height: 1.95;
    }

    .article-body :global(h2) {
      font-size: 20px;
    }

    .article-body :global(h3) {
      font-size: 17px;
    }
  }
`;
