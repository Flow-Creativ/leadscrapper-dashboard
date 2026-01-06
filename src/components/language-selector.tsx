"use client";

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { updateUserPreferences } from '@/lib/api';

export function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('languageSelector');

  const handleLanguageChange = async (newLocale: string) => {
    // Set cookie for immediate effect
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Sync with database if authenticated (non-blocking)
    try {
      await updateUserPreferences({ language: newLocale });
    } catch (error) {
      // Non-authenticated users or error - just use cookie
      console.log('Could not sync language preference:', error);
    }

    // Refresh the page to apply new locale
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t('selectLanguage')}>
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange('en')}
          className={locale === 'en' ? 'bg-accent' : ''}
        >
          {t('english')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('id')}
          className={locale === 'id' ? 'bg-accent' : ''}
        >
          {t('indonesian')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
