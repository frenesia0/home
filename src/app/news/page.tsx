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
  frenesiaYearToGalactic,
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
  const [searchQuery, setSearchQuery] = useState('');

  const visibleArticles = useMemo(() => {
    const normalizedQuery = searchQuery
      .trim()
      .toLocaleLowerCase('ja');

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

        // タイトル＋本文の単語検索
        if (normalizedQuery) {
          const searchableText = [
            article.title,
            htmlToSearchText(article.bodyHtml),
          ]
            .join(' ')
            .toLocaleLowerCase('ja');

          if (!searchableText.includes(normalizedQuery)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // ALLは「サイト上で最後に更新された順」。
        // 作中年代の大きさには左右されない。
        if (filter === 'all') {
          return (
            getUpdateTime(b) -
            getUpdateTime(a)
          );
        }

        // タグ絞り込み時は、そのタグ内の作中日付順。
        // フレネシア暦と銀河暦は同じ時系列へ正規化する。
        const dateDiff =
          getArticleSortValue(b) -
          getArticleSortValue(a);

        if (dateDiff !== 0) {
          return dateDiff;
        }

        return (
          getUpdateTime(b) -
          getUpdateTime(a)
        );
      });
  }, [articles, filter, isAdmin, searchQuery]);

  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <main className="news-page">
      <header className="news-header">
        <div>
          <p className="news-kicker">
            FRENESIA ARCHIVE
          </p>

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

      <div className="news-search">
        <span
          className="search-icon"
          aria-hidden="true"
        >
          ⌕
        </span>

        <input
          type="search"
          value={searchQuery}
          onChange={event =>
            setSearchQuery(event.target.value)
          }
          placeholder="SEARCH ARTICLES"
          aria-label="NEWSの記事を検索"
        />

        {hasSearchQuery && (
          <button
            type="button"
            className="search-clear"
            onClick={() => setSearchQuery('')}
            aria-label="検索をクリア"
          >
            ×
          </button>
        )}
      </div>

      <nav
        className="news-filters"
        aria-label="NEWS TAG FILTER"
      >
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
            className={
              filter === tag.value ? 'active' : ''
            }
            onClick={() => setFilter(tag.value)}
          >
            {tag.label}
          </button>
        ))}
      </nav>

      {!loaded ? (
        <div className="news-message">
          LOADING...
        </div>
      ) : visibleArticles.length === 0 ? (
        <div className="news-message">
          {hasSearchQuery
            ? 'NO RESULTS'
            : 'NO NEWS'}
        </div>
      ) : (
        <section className="news-list">
          {visibleArticles.map(article => (
            <button
              key={article.id}
              type="button"
              className="news-row"
              onClick={() =>
                router.push(
                  `/news/${encodeURIComponent(
                    article.id
                  )}`
                )
              }
            >
              <time>
                {formatArticleDate(article)}
              </time>

              <span className="news-tag">
                {newsTagLabel(article.tag)}
              </span>

              <span className="news-title">
                {article.title}
              </span>

              {isAdmin &&
                article.status === 'draft' && (
                  <span className="draft-badge">
                    DRAFT
                  </span>
                )}

              <span className="news-arrow">
                →
              </span>
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
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.2);
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
          border: 1px solid
            rgba(255, 255, 255, 0.7);
          border-radius: 999px;
          background: #f5f5f5;
          color: #17191f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
          cursor: pointer;
        }

        .news-search {
          position: relative;
          display: flex;
          align-items: center;
          margin-top: 22px;
          border: 1px solid
            rgba(255, 255, 255, 0.16);
          border-radius: 8px;
          background: rgba(
            255,
            255,
            255,
            0.025
          );
          transition:
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .news-search:focus-within {
          border-color: rgba(
            170,
            174,
            242,
            0.75
          );
          background: rgba(
            128,
            131,
            214,
            0.06
          );
        }

        .search-icon {
          flex: 0 0 auto;
          padding-left: 14px;
          color: rgba(255, 255, 255, 0.4);
          font-size: 17px;
          line-height: 1;
          pointer-events: none;
        }

        .news-search input {
          width: 100%;
          min-width: 0;
          padding: 12px 14px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #f5f5f5;
          font: inherit;
          font-size: 11px;
          letter-spacing: 0.08em;
        }

        .news-search input::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .news-search input::-webkit-search-cancel-button {
          display: none;
        }

        .search-clear {
          flex: 0 0 auto;
          width: 40px;
          align-self: stretch;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.42);
          font-size: 18px;
          cursor: pointer;
          transition: color 0.18s ease;
        }

        .search-clear:hover {
          color: #aaaef2;
        }

        .news-filters {
          display: flex;
          gap: 8px;
          padding: 16px 0 22px;
          overflow-x: auto;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.1);
          scrollbar-width: none;
        }

        .news-filters::-webkit-scrollbar {
          display: none;
        }

        .news-filters button {
          flex: 0 0 auto;
          padding: 7px 12px;
          border: 1px solid
            rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          background: rgba(
            255,
            255,
            255,
            0.025
          );
          color: rgba(255, 255, 255, 0.56);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.1em;
          cursor: pointer;
        }

        .news-filters button.active {
          border-color: #8083d6;
          background: rgba(
            128,
            131,
            214,
            0.15
          );
          color: #fff;
        }

        .news-list {
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.16);
        }

        .news-row {
          width: 100%;
          min-height: 70px;
          display: grid;
          grid-template-columns:
            140px 120px minmax(0, 1fr)
            auto 24px;
          align-items: center;
          gap: 16px;
          padding: 14px 4px;
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.11);
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
          background: rgba(
            255,
            255,
            255,
            0.035
          );
        }

        time {
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.08em;
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
          border: 1px solid
            rgba(128, 131, 214, 0.5);
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
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.14);
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

          .news-search {
            margin-top: 18px;
          }

          .news-search input {
            padding-top: 11px;
            padding-bottom: 11px;
            font-size: 10px;
          }

          .news-filters {
            margin-right: -18px;
            padding-right: 18px;
          }

          .news-row {
            grid-template-columns:
              104px minmax(0, 1fr) auto;
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

function htmlToSearchText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseArticleDate(article: NewsArticle) {
  if (article.calendarDate) {
    return article.calendarDate;
  }

  const match = article.date.match(
    /^(-?\d+)-(\d{1,2})-(\d{1,2})$/
  );

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatArticleDate(article: NewsArticle) {
  const parts = parseArticleDate(article);

  if (!parts) {
    return article.date.replaceAll('-', '.');
  }

  const month = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');

  if (article.calendar === 'frenesia') {
    return `F${parts.year}.${month}.${day}`;
  }

  if (article.calendar === 'galactic') {
    return `G${parts.year}.${month}.${day}`;
  }

  // 暦対応前の記事・暦情報をまだ保存していない記事への暫定互換。
  // SHIKI / SOLASで西暦としては不自然に小さい年は
  // フレネシア暦として表示する。
  if (
    !article.calendar &&
    (article.tag === 'shiki' ||
      article.tag === 'solas') &&
    parts.year < 2000
  ) {
    return `F${parts.year}.${month}.${day}`;
  }

  // 銀河暦は桁数で判別できるので、旧データでもG表示できる。
  if (!article.calendar && parts.year >= 100000) {
    return `G${parts.year}.${month}.${day}`;
  }

  return `${parts.year}.${month}.${day}`;
}

function getArticleSortValue(article: NewsArticle) {
  const parts = parseArticleDate(article);

  if (!parts) {
    return 0;
  }

  let normalizedYear = parts.year;

  if (article.calendar === 'frenesia') {
    normalizedYear =
      frenesiaYearToGalactic(parts.year);
  }

  return (
    normalizedYear * 10000 +
    parts.month * 100 +
    parts.day
  );
}

function getUpdateTime(article: NewsArticle) {
  const updated = new Date(
    article.updatedAt
  ).getTime();

  if (!Number.isNaN(updated)) {
    return updated;
  }

  const created = new Date(
    article.createdAt
  ).getTime();

  if (!Number.isNaN(created)) {
    return created;
  }

  return 0;
}
