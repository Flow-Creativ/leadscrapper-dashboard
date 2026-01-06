"use client";

import { MapPin, History, LogOut, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/auth-provider";
import { trackNavigation } from "@/lib/firebase/analytics";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslations } from 'next-intl';

export function Header() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const t = useTranslations('common');

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/signin");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <MapPin className="h-5 w-5 text-primary" />
          <span>{t('appName')}</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2">
          {!isLoading && user && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" onClick={() => trackNavigation("/", "header")}>
                  <MapPin className="mr-2 h-4 w-4" />
                  {t('dashboard')}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/jobs" onClick={() => trackNavigation("/jobs", "header")}>
                  <History className="mr-2 h-4 w-4" />
                  {t('jobs')}
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground px-2 hidden sm:block">
                {user.email}
              </span>
              <LanguageSelector />
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('signOut')}
              </Button>
            </>
          )}
          {!isLoading && !user && (
            <>
              <LanguageSelector />
              <Button variant="default" size="sm" asChild>
                <Link href="/auth/signin" onClick={() => trackNavigation("/auth/signin", "header")}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t('signIn')}
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
