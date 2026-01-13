import { Rating } from '@/types';

export function getRatingFromScore(score: number): Rating {
  if (score >= 90) return 'Kiemelkedő';
  if (score >= 80) return 'Kiforrott';
  if (score >= 65) return 'Jó';
  if (score >= 50) return 'Elfogadható';
  if (score >= 35) return 'Fejlesztendő';
  return 'Újragondolandó';
}

export function getRatingColor(rating: Rating): string {
  switch (rating) {
    case 'Kiemelkedő':
      return 'var(--color-success-500)';
    case 'Kiforrott':
      return 'var(--color-cyan-500)';
    case 'Jó':
      return 'var(--color-blue-500)';
    case 'Elfogadható':
      return 'var(--color-violet-500)';
    case 'Fejlesztendő':
      return 'var(--color-warning-500)';
    case 'Újragondolandó':
      return 'var(--color-error-500)';
  }
}

export function getRatingIcon(rating: Rating): string {
  switch (rating) {
    case 'Kiemelkedő':
      return '🏆';
    case 'Kiforrott':
      return '⭐';
    case 'Jó':
      return '✅';
    case 'Elfogadható':
      return '👍';
    case 'Fejlesztendő':
      return '⚠️';
    case 'Újragondolandó':
      return '🔴';
  }
}

export function getScoreColorClass(score: number, maxScore: number): string {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 90) return 'text-success-500';
  if (percentage >= 80) return 'text-cyan-500';
  if (percentage >= 65) return 'text-blue-500';
  if (percentage >= 50) return 'text-violet-500';
  if (percentage >= 35) return 'text-warning-500';
  return 'text-error-500';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Csak PNG, JPG és WebP formátum engedélyezett' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'A fájl mérete maximum 5MB lehet' };
  }

  return { valid: true };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function getMediaType(file: File): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' {
  return file.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
}

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}
