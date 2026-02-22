import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency: string = 'PHP'): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Date(date).toLocaleDateString('en-US', options || defaultOptions);
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;

  return formatDate(date);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) errors.push('At least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
  if (!/\d/.test(password)) errors.push('At least one number');

  return { valid: errors.length === 0, errors };
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    new: 'Brand New',
    like_new: 'Like New',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };
  return labels[condition] || condition;
}

export function getConditionColor(condition: string): string {
  const colors: Record<string, string> = {
    new: 'bg-green-100 text-green-800',
    like_new: 'bg-emerald-100 text-emerald-800',
    good: 'bg-blue-100 text-blue-800',
    fair: 'bg-yellow-100 text-yellow-800',
    poor: 'bg-red-100 text-red-800',
  };
  return colors[condition] || 'bg-gray-100 text-gray-800';
}

export function getPriceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    fixed: 'Fixed Price',
    negotiable: 'Negotiable',
    free: 'Free',
  };
  return labels[type] || type;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    published: 'Published',
    sold: 'Sold',
    archived: 'Archived',
    suspended: 'Suspended',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    published: 'bg-green-100 text-green-800',
    sold: 'bg-blue-100 text-blue-800',
    archived: 'bg-yellow-100 text-yellow-800',
    suspended: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export const CONDITION_OPTIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export const PRICE_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'negotiable', label: 'Negotiable' },
  { value: 'free', label: 'Free' },
];

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price_low', label: 'Price: Low to High' },
  { value: 'price_high', label: 'Price: High to Low' },
];
