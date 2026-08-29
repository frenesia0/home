'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import {
  NEWS_SEED,
  NEWS_TAGS,
  NewsArticle,
  NewsTag,
  newsTagLabel,
} from '@/lib/newsStore';

type Filter = 'all' | NewsTag;

export default function NewsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [articles, , loaded] = useLocalList<NewsArticle>(
    'ohome.news.v1',
    NEWS_SEED
  );

  const [filter, setFilter] = useState<Filter>('all');

  const visibleArticles = useMemo(() => {
    return articles
      .filter(article => {
        // 一般閲覧者には公開記事だけ見せる
        if (!isAdmin && article.status !== 'published') {
          return false;
        }

        // タグ絞り込み
        if (filter !== 'all' && article.tag !== filter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateDiff =
          new Date(b.date).getTime() - new Date(a.date).getTime();

        if (dateDiff !== 0) return dateDiff;

        return (
          new Date(b.updatedAt).getTime() -
          new Date(a.updatedAt).getTime()
        );
      });
  }, [articles, filter, isAdmin]);

  return (
    <main className="news-page">
      <header className="news-header">
        <div>
          <p className="news-kicker">FRENESIA ARCHIVE</p>
          <h1>NEWS</h1>
        </div>

        {isAdmin && (
          <button
            type="button"
            className="new-button"
            onClick={() => router.push('/news/new')}
          >
            NEW
          </button>
        )}
      </header>

      <nav className="news-filters" aria-label="NEWS TAG FILTER">
        <button
          type="button"
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          ALL
        </button>

        {NEWS_TAGS.map(tag => (
          <button
            key={tag.value}
            type="button"
            className={filter === tag.value ? 'active' : ''}
            onClick={() => setFilter(tag.value)}
          >
            {tag.label}
          </button>
        ))}
      </nav>

      {!loaded ? (
        <div className="news-message">LOADING...</div>
      ) : visibleArticles.length === 0 ? (
        <div className="news-message">NO NEWS</div>
      ) : (
        <section className="news-list">
          {visibleArticles.map(article => (
            <button
              key={article.id}
              type="button"
              className="news-row"
              onClick={() =>
                router.push(`/news/${encodeURIComponent(article.id)}`)
              }
            >
              <time>{formatDate(article.date)}</time>

              <span className="news-tag">
                {newsTagLabel(article.tag)}
              </span>

              <span className="news-title">{article.title}</span>

              {isAdmin && article.status === 'draft' && (
                <span className="draft-badge">DRAFT</span>
              )}

              <span className="news-arrow">→</span>
            </button>
          ))}
        </section>
      )}

      <style jsx>{`
        .news-page {
          width: min(100%, 1080px);
          margin: 0 auto;
          padding: 72px 32px 100px;
          color: #f5f5f5;
        }

        .news-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }

        .news-kicker {
          margin: 0 0 9px;
          color: rgba(255, 255, 255, 0.42);
          font-size: 10px;
          letter-spacing: 0.2em;
        }

        h1 {
          margin: 0;
          font-size: clamp(30px, 5vw, 46px);
          line-height: 1;
          letter-spacing: 0.1em;
        }

        .new-button {
          flex: 0 0 auto;
          min-width: 86px;
          padding: 10px 18px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 999px;
          background: #f5f5f5;
          color: #17191f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          cursor: pointer;
        }

        .news-filters {
          display: flex;
          gap: 8px;
          padding: 22px 0;
          overflow-x: auto;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          scrollbar-width: none;
        }

        .news-filters::-webkit-scrollbar {
          display: none;
        }

        .news-filters button {
          flex: 0 0 auto;
          padding: 7px 12px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.025);
          color: rgba(255, 255, 255, 0.56);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          cursor: pointer;
        }

        .news-filters button.active {
          border-color: #8083d6;
          background: rgba(128, 131, 214, 0.15);
          color: #fff;
        }

        .news-list {
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        }

        .news-row {
          width: 100%;
          min-height: 70px;
          display: grid;
          grid-template-columns: 105px 120px minmax(0, 1fr) auto 24px;
          align-items: center;
          gap: 16px;
          padding: 14px 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.11);
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            background 0.18s ease,
            padding 0.18s ease;
        }

        .news-row:last-child {
          border-bottom: 0;
        }

        .news-row:hover {
          padding-left: 12px;
          padding-right: 12px;
          background: rgba(255, 255, 255, 0.035);
        }

        time {
          color: rgba(255, 255, 255, 0.48);
          font-size: 10px;
          letter-spacing: 0.1em;
        }

        .news-tag {
          color: #aaaef2;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .news-title {
          min-width: 0;
          overflow: hidden;
          color: rgba(255, 255, 255, 0.94);
          font-size: 14px;
          font-weight: 600;
          line-height: 1.6;
          text-overflow: ellipsis;
          white-space: nowrap;
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

        .news-arrow {
          color: rgba(255, 255, 255, 0.36);
          font-size: 14px;
          transition: transform 0.18s ease;
        }

        .news-row:hover .news-arrow {
          transform: translateX(3px);
        }

        .news-message {
          padding: 80px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.35);
          font-size: 10px;
          letter-spacing: 0.16em;
          text-align: center;
        }

        @media (max-width: 700px) {
          .news-page {
            padding: 42px 18px 80px;
          }

          .news-header {
            align-items: center;
          }

          .new-button {
            min-width: 70px;
            padding: 9px 13px;
          }

          .news-filters {
            margin-right: -18px;
            padding-right: 18px;
          }

          .news-row {
            grid-template-columns: 76px minmax(0, 1fr) auto;
            gap: 8px 12px;
            min-height: 78px;
            padding: 13px 2px;
          }

          time {
            grid-column: 1;
            grid-row: 1;
          }

          .news-tag {
            grid-column: 1;
            grid-row: 2;
          }

          .news-title {
            grid-column: 2;
            grid-row: 1 / 3;
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .draft-badge {
            grid-column: 3;
            grid-row: 1;
          }

          .news-arrow {
            grid-column: 3;
            grid-row: 2;
            justify-self: end;
          }
        }
      `}</style>
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
