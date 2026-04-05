import { Navbar } from './Navbar';
import { Toaster } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="datagen-accent h-screen overflow-hidden bg-background text-foreground">
      <Navbar />
      <main
        className="h-full overflow-hidden"
        style={{ paddingTop: 'var(--app-navbar-offset, 5.5rem)' }}
      >
        {children}
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
