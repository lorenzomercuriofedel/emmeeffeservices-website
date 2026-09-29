import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Link e router condividono i prefissi /meteo, /meteo/en e /meteo/de.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
