import { Rating } from '@/types';

export function getRatingFromScore(score: number): Rating {
  if (score >= 90) return 'Kiváló';
  if (score >= 75) return 'Jó';
  if (score >= 50) return 'Fejlesztendő';
  return 'Újragondolandó';
}

export function getRatingColor(rating: Rating): string {
  switch (rating) {
    case 'Kiváló':
      return 'var(--score-excellent)';
    case 'Jó':
      return 'var(--score-good)';
    case 'Fejlesztendő':
      return 'var(--score-fair)';
    case 'Újragondolandó':
      return 'var(--score-poor)';
  }
}

export function getRatingIcon(rating: Rating): string {
  switch (rating) {
    case 'Kiváló':
      return '🏆';
    case 'Jó':
      return '✅';
    case 'Fejlesztendő':
      return '⚠️';
    case 'Újragondolandó':
      return '🔴';
  }
}

export function getScoreColorClass(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'text-score-excellent';
  if (percentage >= 75) return 'text-score-good';
  if (percentage >= 50) return 'text-score-fair';
  return 'text-score-poor';
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:image/xxx;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function getMediaType(file: File): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  const type = file.type;
  if (type === 'image/jpeg' || type === 'image/jpg') return 'image/jpeg';
  if (type === 'image/png') return 'image/png';
  if (type === 'image/gif') return 'image/gif';
  if (type === 'image/webp') return 'image/webp';
  return 'image/png'; // default
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Csak PNG, JPG és WebP formátum támogatott.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'A fájl mérete maximum 5MB lehet.' };
  }

  return { valid: true };
}

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}
