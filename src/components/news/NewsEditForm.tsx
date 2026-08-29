'use client';

import { useMemo, useState } from 'react';
import { RichEditor } from '@/components/ui/RichEditor';
import {
  DEFAULT_CALENDAR_BY_TAG,
  NEWS_TAGS,
  NewsArticle,
  NewsCalendar,
  NewsCalendarDate,
  NewsStatus,
  NewsTag,
  formatNewsCalendarDate,
  frenesiaYearToGalactic,
  SHIKI_COMPLETION_DATE,
  galacticYearToFrenesia,
  getDaysSinceShikiCompletion,
  getFrenesiaDisplayForGalacticDate,
  getSolasAgeAtFrenesiaDate,
  getTimelineMemoByFrenesiaYear,
  getTimelineMemoByGalacticYear,
} from '@/lib/newsStore';

export type NewsFormValue = Pick<
  NewsArticle,
  'title' | 'date' | 'tag' | 'bodyHtml'
> & {
  calendar: NewsCalendar;
  calendarDate: NewsCalendarDate;
};

type NewsEditFormProps = {
  initialValue?: Partial<NewsFormValue>;
  onSubmit: (
    value: NewsFormValue,
    status: NewsStatus
  ) => void | Promise<void>;
  saving?: boolean;
  currentStatus?: NewsStatus;
};

function todayParts(): NewsCalendarDate {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function toLegacyDate(
  date: NewsCalendarDate
) {
  return `${String(date.year).padStart(
    4,
    '0'
  )}-${String(date.month).padStart(
    2,
    '0'
  )}-${String(date.day).padStart(2, '0')}`;
}

function parseLegacyDate(
  value?: string
): NewsCalendarDate | null {
  if (!value) return null;

  const match = value.match(
    /^(-?\d+)-(\d{2})-(\d{2})$/
  );

  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function hasBodyContent(html: string) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim().length > 0;
}

function getShikiAgeAtFrenesiaDate(
  date: NewsCalendarDate
) {
  let age =
    date.year - SHIKI_COMPLETION_DATE.year;

  if (
    date.month < SHIKI_COMPLETION_DATE.month ||
    (
      date.month === SHIKI_COMPLETION_DATE.month &&
      date.day < SHIKI_COMPLETION_DATE.day
    )
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}

function isDefinitelyAfterFrenesiaFall(
  date: NewsCalendarDate
) {
  // 滅亡日はまだ1100年の具体的な月日が未確定。
  // そのため現時点では1101年以降を確実な「滅亡後」と判定する。
  return date.year > 1100;
}

function isValidCalendarDate(
  date: NewsCalendarDate
) {
  if (!Number.isInteger(date.year)) {
    return false;
  }

  if (
    !Number.isInteger(date.month) ||
    date.month < 1 ||
    date.month > 12
  ) {
    return false;
  }

  if (
    !Number.isInteger(date.day) ||
    date.day < 1 ||
    date.day > 31
  ) {
    return false;
  }

  return true;
}

const CALENDAR_OPTIONS: {
  value: NewsCalendar;
  label: string;
}[] = [
  {
    value: 'western',
    label: '西暦',
  },
  {
    value: 'frenesia',
    label: 'フレネシア暦',
  },
  {
    value: 'galactic',
    label: '銀河暦',
  },
];

export default function NewsEditForm({
  initialValue,
  onSubmit,
  saving = false,
  currentStatus = 'draft',
}: NewsEditFormProps) {
  const initialTag =
    initialValue?.tag ?? 'news';

  const initialCalendar =
    initialValue?.calendar ??
    DEFAULT_CALENDAR_BY_TAG[initialTag];

  const fallbackDate =
    parseLegacyDate(initialValue?.date) ??
    todayParts();

  const [title, setTitle] = useState(
    initialValue?.title ?? ''
  );

  const [tag, setTag] = useState<NewsTag>(
    initialTag
  );

  const [calendar, setCalendar] =
    useState<NewsCalendar>(initialCalendar);

  const [calendarDate, setCalendarDate] =
    useState<NewsCalendarDate>(
      initialValue?.calendarDate ??
        (
          initialCalendar === 'frenesia'
            ? {
                year: 1098,
                month: fallbackDate.month,
                day: fallbackDate.day,
              }
            : initialCalendar === 'galactic'
              ? {
                  year: 723642,
                  month: fallbackDate.month,
                  day: fallbackDate.day,
                }
              : fallbackDate
        )
    );

  const [bodyHtml, setBodyHtml] =
    useState(initialValue?.bodyHtml ?? '');

  const frenesiaEquivalent =
    useMemo<NewsCalendarDate | null>(() => {
      if (calendar === 'frenesia') {
        return calendarDate;
      }

      if (calendar === 'galactic') {
        return {
          year: galacticYearToFrenesia(
            calendarDate.year
          ),
          month: calendarDate.month,
          day: calendarDate.day,
        };
      }

      return null;
    }, [calendar, calendarDate]);

  const timelineMemo = useMemo(() => {
    if (calendar === 'frenesia') {
      return getTimelineMemoByFrenesiaYear(
        calendarDate.year
      );
    }

    if (calendar === 'galactic') {
      return getTimelineMemoByGalacticYear(
        calendarDate.year
      );
    }

    return undefined;
  }, [calendar, calendarDate.year]);

  const shikiDays = useMemo(() => {
    if (!frenesiaEquivalent) return null;

    const days =
      getDaysSinceShikiCompletion(
        frenesiaEquivalent
      );

    return days >= 0 ? days : null;
  }, [frenesiaEquivalent]);

  const solasAge = useMemo(() => {
    if (!frenesiaEquivalent) return null;

    return getSolasAgeAtFrenesiaDate(
      frenesiaEquivalent
    );
  }, [frenesiaEquivalent]);

  const shikiAge = useMemo(() => {
    if (!frenesiaEquivalent) return null;

    return getShikiAgeAtFrenesiaDate(
      frenesiaEquivalent
    );
  }, [frenesiaEquivalent]);

  const isAfterFrenesiaFall = useMemo(() => {
    if (!frenesiaEquivalent) return false;

    return isDefinitelyAfterFrenesiaFall(
      frenesiaEquivalent
    );
  }, [frenesiaEquivalent]);

  const changeTag = (nextTag: NewsTag) => {
    setTag(nextTag);

    const nextCalendar =
      DEFAULT_CALENDAR_BY_TAG[nextTag];

    if (nextCalendar === calendar) {
      return;
    }

    setCalendar(nextCalendar);

    if (
      calendar === 'frenesia' &&
      nextCalendar === 'galactic'
    ) {
      setCalendarDate(current => ({
        ...current,
        year: frenesiaYearToGalactic(
          current.year
        ),
      }));
      return;
    }

    if (
      calendar === 'galactic' &&
      nextCalendar === 'frenesia'
    ) {
      setCalendarDate(current => ({
        ...current,
        year: galacticYearToFrenesia(
          current.year
        ),
      }));
      return;
    }

    if (nextCalendar === 'western') {
      setCalendarDate(todayParts());
      return;
    }

    if (nextCalendar === 'frenesia') {
      setCalendarDate({
        year: 1098,
        month: calendarDate.month,
        day: calendarDate.day,
      });
      return;
    }

    setCalendarDate({
      year: 723642,
      month: calendarDate.month,
      day: calendarDate.day,
    });
  };

  const changeCalendar = (
    nextCalendar: NewsCalendar
  ) => {
    if (nextCalendar === calendar) return;

    if (
      calendar === 'frenesia' &&
      nextCalendar === 'galactic'
    ) {
      setCalendarDate(current => ({
        ...current,
        year: frenesiaYearToGalactic(
          current.year
        ),
      }));
    } else if (
      calendar === 'galactic' &&
      nextCalendar === 'frenesia'
    ) {
      setCalendarDate(current => ({
        ...current,
        year: galacticYearToFrenesia(
          current.year
        ),
      }));
    } else if (nextCalendar === 'western') {
      setCalendarDate(todayParts());
    } else if (nextCalendar === 'frenesia') {
      setCalendarDate({
        year: 1098,
        month: calendarDate.month,
        day: calendarDate.day,
      });
    } else {
      setCalendarDate({
        year: 723642,
        month: calendarDate.month,
        day: calendarDate.day,
      });
    }

    setCalendar(nextCalendar);
  };

  const updateDatePart = (
    key: keyof NewsCalendarDate,
    rawValue: string
  ) => {
    const value = Number(rawValue);

    setCalendarDate(current => ({
      ...current,
      [key]: Number.isFinite(value)
        ? value
        : 0,
    }));
  };

  const save = async (
    status: NewsStatus
  ) => {
    if (!isValidCalendarDate(calendarDate)) {
      window.alert(
        '日付を正しく入力してください。'
      );
      return;
    }

    if (status === 'published') {
      if (!title.trim()) {
        window.alert(
          'タイトルを入力してください。'
        );
        return;
      }

      if (!hasBodyContent(bodyHtml)) {
        window.alert(
          '本文を入力してください。'
        );
        return;
      }
    }

    await onSubmit(
      {
        title: title.trim(),
        date: toLegacyDate(calendarDate),
        tag,
        bodyHtml,
        calendar,
        calendarDate,
      },
      status
    );
  };

  return (
    <section className="news-edit-form">
      <div className="news-field">
        <label htmlFor="news-title">
          TITLE
        </label>

        <input
          id="news-title"
          type="text"
          value={title}
          onChange={e =>
            setTitle(e.target.value)
          }
          placeholder="記事タイトル"
          disabled={saving}
        />
      </div>

      <div className="news-meta-grid">
        <div className="news-field">
          <label htmlFor="news-tag">
            TAG
          </label>

          <select
            id="news-tag"
            value={tag}
            onChange={e =>
              changeTag(
                e.target.value as NewsTag
              )
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

        <div className="news-field">
          <label htmlFor="news-calendar">
            CALENDAR
          </label>

          <select
            id="news-calendar"
            value={calendar}
            onChange={e =>
              changeCalendar(
                e.target
                  .value as NewsCalendar
              )
            }
            disabled={saving}
          >
            {CALENDAR_OPTIONS.map(
              item => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="news-field">
        <label>DATE</label>

        <div className="date-parts">
          <label className="date-part">
            <span>YEAR</span>
            <input
              type="number"
              value={calendarDate.year}
              onChange={e =>
                updateDatePart(
                  'year',
                  e.target.value
                )
              }
              disabled={saving}
            />
          </label>

          <label className="date-part">
            <span>MONTH</span>
            <input
              type="number"
              min={1}
              max={12}
              value={calendarDate.month}
              onChange={e =>
                updateDatePart(
                  'month',
                  e.target.value
                )
              }
              disabled={saving}
            />
          </label>

          <label className="date-part">
            <span>DAY</span>
            <input
              type="number"
              min={1}
              max={31}
              value={calendarDate.day}
              onChange={e =>
                updateDatePart(
                  'day',
                  e.target.value
                )
              }
              disabled={saving}
            />
          </label>
        </div>
      </div>

      <div className="calendar-preview">
        <div className="calendar-main">
          {formatNewsCalendarDate(
            calendar,
            calendarDate
          )}
        </div>

        {calendar === 'galactic' && (
          <div className="calendar-sub">
            {getFrenesiaDisplayForGalacticDate(
              calendarDate
            )}
          </div>
        )}

        {calendar !== 'western' && (
          <div className="calendar-facts">
            {isAfterFrenesiaFall
              ? shikiAge !== null && (
                  <span>
                    シキ {shikiAge}歳
                  </span>
                )
              : solasAge !== null && (
                  <span>
                    ソラス {solasAge}歳
                  </span>
                )}

            {shikiDays !== null && (
              <span>
                シキが造られて
                {shikiDays}日
              </span>
            )}
          </div>
        )}

        {timelineMemo && (
          <div className="timeline-memo">
            <span className="memo-label">
              TIMELINE
            </span>
            <span>{timelineMemo.text}</span>
          </div>
        )}
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
          onClick={() => save(currentStatus)}
        >
          {saving
            ? 'SAVING...'
            : 'SAVE'}
        </button>

        {currentStatus === 'draft' ? (
          <button
            type="button"
            className="publish-button"
            disabled={saving}
            onClick={() => save('published')}
          >
            {saving
              ? 'SAVING...'
              : 'PUBLISH'}
          </button>
        ) : (
          <button
            type="button"
            className="publish-button"
            disabled={saving}
            onClick={() => save('draft')}
          >
            {saving
              ? 'SAVING...'
              : 'MAKE PRIVATE'}
          </button>
        )}
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

        .news-field > label,
        .news-field > :global(label) {
          color: rgba(
            255,
            255,
            255,
            0.48
          );
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .news-field input,
        .news-field select {
          width: 100%;
          min-height: 46px;
          padding: 10px 13px;
          border: 1px solid
            rgba(255, 255, 255, 0.18);
          border-radius: 6px;
          outline: none;
          background: rgba(
            255,
            255,
            255,
            0.035
          );
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

        .date-parts {
          display: grid;
          grid-template-columns:
            minmax(0, 2fr)
            minmax(0, 1fr)
            minmax(0, 1fr);
          gap: 12px;
        }

        .date-part {
          display: grid;
          gap: 7px;
        }

        .date-part span {
          color: rgba(
            255,
            255,
            255,
            0.34
          );
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .calendar-preview {
          display: grid;
          gap: 8px;
          padding: 16px 18px;
          border: 1px solid
            rgba(128, 131, 214, 0.3);
          border-radius: 7px;
          background: rgba(
            128,
            131,
            214,
            0.06
          );
        }

        .calendar-main {
          color: #f5f5f5;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }

        .calendar-sub {
          color: #aaaef2;
          font-size: 11px;
          font-weight: 700;
        }

        .calendar-facts {
          display: flex;
          flex-wrap: wrap;
          gap: 7px 16px;
          padding-top: 4px;
          color: rgba(
            255,
            255,
            255,
            0.62
          );
          font-size: 10px;
        }

        .timeline-memo {
          display: flex;
          gap: 10px;
          margin-top: 4px;
          padding-top: 10px;
          border-top: 1px solid
            rgba(255, 255, 255, 0.1);
          color: rgba(
            255,
            255,
            255,
            0.68
          );
          font-size: 10px;
          line-height: 1.7;
        }

        .memo-label {
          flex: 0 0 auto;
          color: #aaaef2;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .news-body-field {
          gap: 10px;
        }

        .news-body-field :global(.re-wrap) {
          border-color:
            rgba(
              255,
              255,
              255,
              0.18
            ) !important;
          background: #222730 !important;
        }

        .news-body-field
          :global(.re-toolbar) {
          border-color:
            rgba(
              255,
              255,
              255,
              0.14
            ) !important;
          background: #1b1f27 !important;
        }

        .news-body-field :global(.re-body) {
          background: #222730 !important;
        }

        .news-body-field
          :global(.re-content) {
          min-height: 260px;
          color: #f5f5f5 !important;
          background: #222730 !important;
        }

        .news-body-field
          :global(.re-content p),
        .news-body-field
          :global(.re-content h2),
        .news-body-field
          :global(.re-content h3),
        .news-body-field
          :global(.re-content li),
        .news-body-field
          :global(.re-content blockquote) {
          color: #f5f5f5 !important;
        }

        .news-body-field :global(.re-ph) {
          color:
            rgba(
              255,
              255,
              255,
              0.35
            ) !important;
        }

        .news-body-field :global(.re-btn) {
          color: #f5f5f5 !important;
          -webkit-text-fill-color:
            #f5f5f5 !important;
        }

        .news-body-field
          :global(.re-btn.on) {
          color: #aaaef2 !important;
          -webkit-text-fill-color:
            #aaaef2 !important;
        }

        .news-body-field :global(.re-sep) {
          background:
            rgba(
              255,
              255,
              255,
              0.22
            ) !important;
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
          color: rgba(
            255,
            255,
            255,
            0.82
          );
        }

        .publish-button {
          border: 1px solid #8083d6;
          background: #8083d6;
          color: #fff;
        }

        @media (max-width: 700px) {
          .news-meta-grid,
          .date-parts {
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

          .timeline-memo {
            display: grid;
            gap: 5px;
          }
        }
      `}</style>
    </section>
  );
}
