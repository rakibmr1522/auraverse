export function timeAgo(timestamp: any, lang: 'en' | 'bn' = 'en'): string {
  if (!timestamp) return lang === 'bn' ? 'এইমাত্র' : 'Just now';

  let date: Date;
  if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    date = new Date();
  }

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 10) {
    return lang === 'bn' ? 'এইমাত্র' : 'Just now';
  }

  const convertDigits = (num: number) => {
    if (lang !== 'bn') return num.toString();
    const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(d => bnDigits[parseInt(d)] || d).join('');
  };

  if (seconds < 60) {
    return lang === 'bn' ? `${convertDigits(seconds)} সেকেন্ড আগে` : `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return lang === 'bn' ? `${convertDigits(minutes)} মিনিট আগে` : `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return lang === 'bn' ? `${convertDigits(hours)} ঘন্টা আগে` : `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return lang === 'bn' ? `${convertDigits(days)} দিন আগে` : `${days}d ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return lang === 'bn' ? `${convertDigits(months)} মাস আগে` : `${months}mo ago`;
  }

  const years = Math.floor(months / 12);
  return lang === 'bn' ? `${convertDigits(years)} বছর আগে` : `${years}y ago`;
}
