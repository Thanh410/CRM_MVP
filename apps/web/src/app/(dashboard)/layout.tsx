'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { CommandPalette } from '@/components/ui/command-palette';
import { KeyboardShortcutsProvider } from '@/components/ui/keyboard-shortcuts';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mounted, setMounted] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.push('/login');
  }, [mounted, isAuthenticated, router]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setCmdOpen(o => !o);
    }
    if (e.key === 'Escape') {
      setCmdOpen(false);
      setMobileNavOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!mounted) return <div className="flex h-dvh bg-background" />;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {/* Sidebar — desktop sticky, mobile drawer */}
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onOpenSearch={() => setCmdOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="min-w-0 flex-1 overflow-y-auto bg-muted/40 px-3 py-4 pb-20 sm:px-6 sm:py-6 lg:pb-6">
          {children}
        </main>
      </div>
      {/* Mobile bottom tab bar */}
      <BottomNav onOpenMore={() => setMobileNavOpen(true)} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <KeyboardShortcutsProvider />
    </div>
  );
}
