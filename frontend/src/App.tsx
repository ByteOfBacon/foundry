import { Route, Switch } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { DashboardPage } from '@/pages/DashboardPage';
import { DemandEditorPage } from '@/pages/DemandEditorPage';
import { TooltipProvider } from '@/components/ui/tooltip';

export function App() {
  return (
    <TooltipProvider>
      <Layout>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/demand" component={DemandEditorPage} />
          <Route>
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Page not found
            </div>
          </Route>
        </Switch>
      </Layout>
    </TooltipProvider>
  );
}
