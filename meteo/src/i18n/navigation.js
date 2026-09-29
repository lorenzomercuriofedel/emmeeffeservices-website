import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Wrapper localizzati di Link / useRouter / usePathname / redirect:
// generano automaticamente il prefisso lingua corretto (/en, /de) e
// mantengono l'italiano senza prefisso.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
