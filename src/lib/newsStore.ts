export type NewsTag =
  | 'news'
  | 'world'
  | 'solas'
  | 'shiki'
  | 'other';

export type NewsStatus =
  | 'draft'
  | 'private'
  | 'published';

export type NewsCalendar =
  | 'western'
  | 'frenesia'
  | 'galactic';

export interface NewsArticle {
  id: string;
  title: string;

  /**
   * 既存記事との互換用。
   * 新規記事では calendarDate と同じ日付を YYYY-MM-DD 形式で保持する。
   */
  date: string;

  /**
   * 記事で使用する暦。
   * 既存記事は未設定でも西暦として扱えるよう optional にしている。
   */
  calendar?: NewsCalendar;

  /**
   * 選択した暦での日付。
   */
  calendarDate?: {
    year: number;
    month: number;
    day: number;
  };

  /**
   * URL用。
   * 例:
   * 20260829-01
   * F10980829-01
   * G7236420829-01
   *
   * 既存記事との互換のため optional。
   */
  slug?: string;

  bodyHtml: string;
  tag: NewsTag;
  status: NewsStatus;
  createdAt: string;
  updatedAt: string;

  // Firestoreで一般公開 / 非公開コンテンツを分ける
  visibility: 'public' | 'private';

  // 作成者
  authorId?: string;

  /**
   * NEWS一覧の上部へ固定する。
   * 既存記事との互換のため optional。
   * true の記事は複数・上限なしでPIN可能。
   */
  pinned?: boolean;

  /**
   * PINした時刻。
   * 通常は新しくPINした記事ほど上へ並べる。
   */
  pinnedAt?: string;

  /**
   * 手動並べ替え用の順序。
   * 値があるPIN記事はこの数値を優先して並べる。
   * 小さい数値ほど上。
   */
  pinOrder?: number;
}

export interface NewsCalendarDate {
  year: number;
  month: number;
  day: number;
}

export interface NewsTimelineMemo {
  frenesiaYear: number;
  galacticYear: number;
  text: string;
}

export const NEWS_SEED: NewsArticle[] = [];

export const NEWS_TAGS: {
  value: NewsTag;
  label: string;
}[] = [
  { value: 'news', label: 'NEWS' },
  {
    value: 'world',
    label: 'WORLD',
  },
  { value: 'shiki', label: 'SHIKI' },
  { value: 'solas', label: 'SOLAS' },
  { value: 'other', label: 'OTHER' },
];

export const newsTagLabel = (tag: NewsTag): string =>
  NEWS_TAGS.find(item => item.value === tag)?.label ?? tag;

/**
 * タグを選んだ時の初期暦。
 * 手動で別の暦へ変更することは可能。
 */
export const DEFAULT_CALENDAR_BY_TAG: Record<
  NewsTag,
  NewsCalendar
> = {
  news: 'galactic',
  world: 'western',
  shiki: 'frenesia',
  solas: 'frenesia',
  other: 'western',
};

/**
 * フレネシア暦1年 = 銀河暦722,545年
 * よって銀河暦 = フレネシア暦 + 722,544
 */
export const GALACTIC_YEAR_OFFSET = 722_544;

export const frenesiaYearToGalactic = (
  frenesiaYear: number
) => frenesiaYear + GALACTIC_YEAR_OFFSET;

export const galacticYearToFrenesia = (
  galacticYear: number
) => galacticYear - GALACTIC_YEAR_OFFSET;

/**
 * 現時点で確定している簡易年表。
 * 後からここへ追加すれば、投稿/編集画面のメモにも使える。
 */
export const NEWS_TIMELINE: NewsTimelineMemo[] = [
  {
    frenesiaYear: 1098,
    galacticYear: 723_642,
    text: 'ソラス19歳。シキが完成する。',
  },
  {
    frenesiaYear: 1100,
    galacticYear: 723_644,
    text: 'ソラス21歳。フレネシア滅亡。',
  },
];

export const getTimelineMemoByFrenesiaYear = (
  year: number
) =>
  NEWS_TIMELINE.find(
    item => item.frenesiaYear === year
  );

export const getTimelineMemoByGalacticYear = (
  year: number
) =>
  NEWS_TIMELINE.find(
    item => item.galacticYear === year
  );

/**
 * シキ完成日。
 * 「完成から何日」はこの日を0日目として経過日数を返す。
 */
export const SHIKI_COMPLETION_DATE: NewsCalendarDate = {
  year: 1098,
  month: 8,
  day: 2,
};

/**
 * ソラスはフレネシア暦1100年8月6日以降に21歳。
 * したがって誕生日はフレネシア暦1079年8月6日。
 */
export const SOLAS_BIRTH_DATE: NewsCalendarDate = {
  year: 1079,
  month: 8,
  day: 6,
};

export const getSolasAgeAtFrenesiaDate = (
  date: NewsCalendarDate
) => {
  let age = date.year - SOLAS_BIRTH_DATE.year;

  if (
    date.month < SOLAS_BIRTH_DATE.month ||
    (
      date.month === SOLAS_BIRTH_DATE.month &&
      date.day < SOLAS_BIRTH_DATE.day
    )
  ) {
    age -= 1;
  }

  return age;
};

/**
 * 実在の暦ではないため、経過日数計算用として
 * 1年=365日の内部シリアル値を使う。
 * 月ごとの日数は通常のグレゴリオ暦と同じ扱い。
 */
const MONTH_LENGTHS = [
  31,
  28,
  31,
  30,
  31,
  30,
  31,
  31,
  30,
  31,
  30,
  31,
];

const calendarSerial = (
  date: NewsCalendarDate
) => {
  const daysBeforeMonth = MONTH_LENGTHS
    .slice(0, Math.max(0, date.month - 1))
    .reduce((sum, days) => sum + days, 0);

  return (
    date.year * 365 +
    daysBeforeMonth +
    (date.day - 1)
  );
};

export const getDaysSinceShikiCompletion = (
  date: NewsCalendarDate
) =>
  calendarSerial(date) -
  calendarSerial(SHIKI_COMPLETION_DATE);

/**
 * フレネシア滅亡日はまだ具体的な月日が未確定。
 * 決まったらここへ設定する。
 */
export const FRENESIA_FALL_DATE:
  | NewsCalendarDate
  | null = null;

export const getFrenesiaDisplayForGalacticDate = (
  date: NewsCalendarDate
) => {
  const frenesiaDate: NewsCalendarDate = {
    year: galacticYearToFrenesia(date.year),
    month: date.month,
    day: date.day,
  };

  if (frenesiaDate.year > 1100) {
    return `フレネシア滅亡後${frenesiaDate.year - 1100}年`;
  }

  if (
    frenesiaDate.year === 1100 &&
    FRENESIA_FALL_DATE
  ) {
    const currentSerial = calendarSerial(
      frenesiaDate
    );
    const fallSerial = calendarSerial(
      FRENESIA_FALL_DATE
    );

    if (currentSerial > fallSerial) {
      return 'フレネシア滅亡後0年';
    }
  }

  return `フレネシア暦${frenesiaDate.year}年${frenesiaDate.month}月${frenesiaDate.day}日`;
};

export const formatNewsCalendarDate = (
  calendar: NewsCalendar,
  date: NewsCalendarDate
) => {
  if (calendar === 'frenesia') {
    return `フレネシア暦${date.year}年${date.month}月${date.day}日`;
  }

  if (calendar === 'galactic') {
    return `銀河暦${date.year.toLocaleString('ja-JP')}年${date.month}月${date.day}日`;
  }

  return `${date.year}.${String(date.month).padStart(
    2,
    '0'
  )}.${String(date.day).padStart(2, '0')}`;
};

const pad2 = (value: number) =>
  String(value).padStart(2, '0');

export const makeNewsSlugBase = (
  calendar: NewsCalendar,
  date: NewsCalendarDate
) => {
  const mmdd = `${pad2(date.month)}${pad2(
    date.day
  )}`;

  if (calendar === 'frenesia') {
    return `F${date.year}${mmdd}`;
  }

  if (calendar === 'galactic') {
    return `G${date.year}${mmdd}`;
  }

  return `${String(date.year).padStart(
    4,
    '0'
  )}${mmdd}`;
};

/**
 * 同じ日付の1件目から -01, -02, -03... を付ける。
 */
export const makeUniqueNewsSlug = (
  calendar: NewsCalendar,
  date: NewsCalendarDate,
  articles: Pick<
    NewsArticle,
    'id' | 'slug'
  >[],
  excludeArticleId?: string
) => {
  const base = makeNewsSlugBase(calendar, date);

  const usedNumbers = articles
    .filter(
      article =>
        article.id !== excludeArticleId &&
        article.slug?.startsWith(`${base}-`)
    )
    .map(article => {
      const match = article.slug?.match(
        /-(\d+)$/
      );

      return match
        ? Number(match[1])
        : 0;
    })
    .filter(
      value =>
        Number.isInteger(value) &&
        value > 0
    );

  let next = 1;

  while (usedNumbers.includes(next)) {
    next += 1;
  }

  return `${base}-${String(next).padStart(
    2,
    '0'
  )}`;
};
