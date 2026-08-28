'use client';

import { useState } from 'react';
import { RichEditor } from '@/components/ui/RichEditor';
import {
  NEWS_TAGS,
  NewsArticle,
  NewsStatus,
  NewsTag,
} from '@/lib/newsStore';

export type NewsFormValue = Pick<
  NewsArticle,
  'title' | 'date' | 'tag' | 'bodyHtml'
>;

type NewsEditFormProps = {
  initialValue?: Partial<NewsFormValue>;
  onSubmit: (
    value: NewsFormValue,
    status: NewsStatus
  ) => void | Promise<void>;
  saving?: boolean;
};

function todayLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function hasBodyContent(html: string) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim().length > 0;
}

export default function NewsEditForm({
  initialValue,
  onSubmit,
  saving = false,
}: NewsEditFormProps) {
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [date, setDate] = useState(initialValue?.date ?? todayLocal());
  const [tag, setTag] = useState<NewsTag>(
    initialValue?.tag ?? 'news'
  );
  const [bodyHtml, setBodyHtml] = useState(
    initialValue?.bodyHtml ?? ''
  );

  const save = async (status: NewsStatus) => {
    if (status === 'published') {
      if (!title.trim()) {
        window.alert('タイトルを入力してください。');
        return;
      }

      if (!hasBodyContent(bodyHtml)) {
        window.alert('本文を入力してください。');
        return;
      }
    }

    await onSubmit(
      {
        title: title.trim(),
        date,
        tag,
        bodyHtml,
      },
      status
    );
  };

  return (
    <section className="news-edit-form">
      <div className="news-field">
        <label htmlFor="news-title">TITLE</label>

        <input
          id="news-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="記事タイトル"
          disabled={saving}
        />
      </div>

      <div className="news-meta-grid">
        <div className="news-field">
          <label htmlFor="news-date">DATE</label>

          <input
            id="news-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="news-field">
          <label htmlFor="news-tag">TAG</label>

          <select
            id="news-tag"
            value={tag}
            onChange={e =>
              setTag(e.target.value as NewsTag)
            }
            disabled={saving}
          >
            {NEWS_TAGS.map(item => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="news-field news-body-field">
        <label>BODY</label>

        <RichEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          placeholder="本文を入力してください"
        />
      </div>

      <div className="news-actions">
        <button
          type="button"
          className="draft-button"
          disabled={saving}
          onClick={() => save('draft')}
        >
          {saving ? 'SAVING...' : 'SAVE DRAFT'}
        </button>

        <button
          type="button"
          className="publish-button"
          disabled={saving}
          onClick={() => save('published')}
        >
          {saving ? 'SAVING...' : 'PUBLISH'}
        </button>
      </div>

      <style jsx>{`
        .news-edit-form {
          display: grid;
          gap: 26px;
        }

        .news-field {
          display: grid;
          gap: 9px;
        }

        .news-field label {
          color: rgba(255, 255, 255, 0.48);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .news-field input,
        .news-field select {
          width: 100%;
          min-height: 46px;
          padding: 10px 13px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 6px;
          outline: none;
          background: rgba(255, 255, 255, 0.035);
          color: #f5f5f5;
          font: inherit;
        }

        .news-field input:focus,
        .news-field select:focus {
          border-color: #8083d6;
        }

        .news-field select option {
          background: #1a1d24;
          color: #f5f5f5;
        }

        .news-meta-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            minmax(0, 1fr);
          gap: 18px;
        }

        .news-body-field {
          gap: 10px;
        }

        .news-body-field :global(.re-wrap) {
          border-color:
            rgba(255, 255, 255, 0.18) !important;
          background: #222730 !important;
        }

        .news-body-field :global(.re-toolbar) {
          border-color:
            rgba(255, 255, 255, 0.14) !important;
          background: #1b1f27 !important;
        }

        .news-body-field :global(.re-body) {
          background: #222730 !important;
        }

        .news-body-field :global(.re-content) {
          min-height: 260px;
          color: #f5f5f5 !important;
          background: #222730 !important;
        }

        .news-body-field :global(.re-content p),
        .news-body-field :global(.re-content h2),
        .news-body-field :global(.re-content h3),
        .news-body-field :global(.re-content li),
        .news-body-field :global(.re-content blockquote) {
          color: #f5f5f5 !important;
        }

        .news-body-field :global(.re-ph) {
          color:
            rgba(255, 255, 255, 0.35) !important;
        }

        .news-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding-top: 6px;
        }

        .news-actions button {
          min-width: 130px;
          min-height: 42px;
          padding: 9px 16px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.12em;
          cursor: pointer;
        }

        .news-actions button:disabled {
          opacity: 0.45;
          cursor: default;
        }

        .draft-button {
          border: 1px solid
            rgba(255, 255, 255, 0.3);
          background: transparent;
          color:
            rgba(255, 255, 255, 0.82);
        }

        .publish-button {
          border: 1px solid #8083d6;
          background: #8083d6;
          color: #fff;
        }

        @media (max-width: 700px) {
          .news-meta-grid {
            grid-template-columns: 1fr;
          }

          .news-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .news-actions button {
            width: 100%;
            min-width: 0;
          }
        }
      `}</style>
    </section>
  );
}
