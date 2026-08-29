'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLocalList } from '@/lib/postStore';
import NewsEditForm, {
  NewsFormValue,
} from '@/components/news/NewsEditForm';
import {
  NEWS_SEED,
  NewsArticle,
  NewsStatus,
  makeUniqueNewsSlug,
} from '@/lib/newsStore';

function makeId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 6)
  );
}

export default function NewNewsPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  const [articles, setArticles, loaded] =
    useLocalList<NewsArticle>(
      'ohome.news.v1',
      NEWS_SEED
    );

  const [saving, setSaving] = useState(false);

  if (!loaded) {
    return (
      <main className="news-new-page">
        <div className="news-message">
          LOADING...
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="news-new-page">
        <div className="news-message">
          このページは管理者専用です。
        </div>
      </main>
    );
  }

  const handleSubmit = async (
    value: NewsFormValue,
    status: NewsStatus
  ) => {
    if (saving) return;

    setSaving(true);

    try {
      const now = new Date().toISOString();
      const id = makeId();

      const slug = makeUniqueNewsSlug(
        value.calendar,
        value.calendarDate,
        articles
      );

      const article: NewsArticle = {
        id,
        slug,
        title: value.title,
        date: value.date,
        calendar: value.calendar,
        calendarDate: value.calendarDate,
        tag: value.tag,
        bodyHtml: value.bodyHtml,
        status,
        createdAt: now,
        updatedAt: now,

        // 下書きはFirestore側でも非公開
        visibility:
          status === 'published'
            ? 'public'
            : 'private',

        authorId: user?.id,
      };

      setArticles([
        article,
        ...articles,
      ]);

      router.push('/news');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="news-new-page">
      <header className="news-new-header">
        <button
          type="button"
          className="back-button"
          onClick={() =>
            router.push('/news')
          }
        >
          ← NEWS
        </button>

        <div>
          <p>FRENESIA ARCHIVE</p>
          <h1>NEW ARTICLE</h1>
        </div>
      </header>

      <NewsEditForm
        onSubmit={handleSubmit}
        saving={saving}
      />

      <style jsx>{`
        .news-new-page {
          width: min(100%, 920px);
          margin: 0 auto;
          padding: 64px 32px 100px;
          color: #f5f5f5;
        }

        .news-new-header {
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
          color: rgba(
            255,
            255,
            255,
            0.56
          );
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          cursor: pointer;
        }

        .back-button:hover {
          color: #fff;
        }

        .news-new-header p {
          margin: 0 0 9px;
          color: rgba(
            255,
            255,
            255,
            0.4
          );
          font-size: 9px;
          letter-spacing: 0.18em;
        }

        .news-new-header h1 {
          margin: 0;
          font-size: clamp(
            26px,
            5vw,
            40px
          );
          letter-spacing: 0.08em;
        }

        .news-message {
          padding: 100px 0;
          color: rgba(
            255,
            255,
            255,
            0.45
          );
          font-size: 11px;
          text-align: center;
        }

        @media (max-width: 700px) {
          .news-new-page {
            padding: 40px 18px 80px;
          }

          .news-new-header {
            margin-bottom: 28px;
          }
        }
      `}</style>
    </main>
  );
}
