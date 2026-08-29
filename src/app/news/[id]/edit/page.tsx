'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import NewsEditForm, {
  NewsFormValue,
} from '@/components/news/NewsEditForm';
import {
  NEWS_SEED,
  NewsArticle,
  NewsStatus,
} from '@/lib/newsStore';

export default function NewsEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();

  const [articles, setArticles, loaded] =
    useLocalList<NewsArticle>(
      'ohome.news.v1',
      NEWS_SEED
    );

  const [saving, setSaving] = useState(false);

  const article = articles.find(
    item => item.id === id || item.slug === id
  );

  if (!loaded) {
    return (
      <main className="news-edit-page">
        <div className="news-message">
          LOADING...
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="news-edit-page">
        <div className="news-message">
          このページは管理者専用です。
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="news-edit-page">
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

  const articleRoute =
    article.slug ?? article.id;

  const handleSubmit = async (
    value: NewsFormValue,
    status: NewsStatus
  ) => {
    if (saving) return;

    setSaving(true);

    try {
      const updatedArticle: NewsArticle = {
        ...article,
        title: value.title,
        date: value.date,
        calendar: value.calendar,
        calendarDate: value.calendarDate,
        tag: value.tag,
        bodyHtml: value.bodyHtml,
        status,
        visibility:
          status === 'published'
            ? 'public'
            : 'private',
        updatedAt: new Date().toISOString(),
      };

      setArticles(
        articles.map(item =>
          item.id === article.id
            ? updatedArticle
            : item
        )
      );

      router.push(
        `/news/${encodeURIComponent(articleRoute)}`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="news-edit-page">
      <header className="news-edit-header">
        <button
          type="button"
          className="back-button"
          onClick={() =>
            router.push(
              `/news/${encodeURIComponent(articleRoute)}`
            )
          }
        >
          ← ARTICLE
        </button>

        <div className="header-row">
          <div>
            <p>FRENESIA ARCHIVE</p>
            <h1>EDIT ARTICLE</h1>
          </div>

          <span
            className={
              article.status === 'draft'
                ? 'status draft'
                : 'status published'
            }
          >
            {article.status === 'draft'
              ? 'PRIVATE'
              : 'PUBLISHED'}
          </span>
        </div>
      </header>

      <NewsEditForm
        initialValue={{
          title: article.title,
          date: article.date,
          calendar: article.calendar,
          calendarDate: article.calendarDate,
          tag: article.tag,
          bodyHtml: article.bodyHtml,
        }}
        onSubmit={handleSubmit}
        saving={saving}
        currentStatus={article.status}
      />

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .news-edit-page {
    width: min(100%, 920px);
    margin: 0 auto;
    padding: 64px 32px 100px;
    color: #f5f5f5;
  }

  .news-edit-header {
    margin-bottom: 36px;
    padding-bottom: 24px;
    border-bottom: 1px solid
      rgba(255, 255, 255, 0.18);
  }

  .back-button {
    margin-bottom: 30px;
    padding: 0;
    border: 0;
    background: transparent;
    color: rgba(255, 255, 255, 0.56);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    cursor: pointer;
  }

  .back-button:hover {
    color: #fff;
  }

  .header-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
  }

  .news-edit-header p {
    margin: 0 0 9px;
    color: rgba(255, 255, 255, 0.4);
    font-size: 9px;
    letter-spacing: 0.18em;
  }

  .news-edit-header h1 {
    margin: 0;
    font-size: clamp(26px, 5vw, 40px);
    letter-spacing: 0.08em;
  }

  .status {
    flex: 0 0 auto;
    padding: 6px 9px;
    border: 1px solid
      rgba(255, 255, 255, 0.2);
    border-radius: 999px;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .status.draft {
    border-color:
      rgba(128, 131, 214, 0.55);
    color: #aaaef2;
  }

  .status.published {
    color:
      rgba(255, 255, 255, 0.72);
  }

  .news-message {
    padding: 100px 0;
    color:
      rgba(255, 255, 255, 0.45);
    font-size: 11px;
    text-align: center;
  }

  @media (max-width: 700px) {
    .news-edit-page {
      padding: 40px 18px 80px;
    }

    .news-edit-header {
      margin-bottom: 28px;
    }

    .header-row {
      align-items: center;
    }
  }
`;
