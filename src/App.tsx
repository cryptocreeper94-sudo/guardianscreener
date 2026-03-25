import { Switch, Route } from "wouter";
import GuardianScreener from "./pages/guardian-screener";
import StrikeAgent from "./pages/strike-agent";
import TokenDetail from "./pages/token-detail";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={GuardianScreener} />
        <Route path="/strike-agent" component={StrikeAgent} />
        <Route path="/token/:chain/:address" component={TokenDetail} />
        <Route path="/guardian-screener/:chain/:address" component={TokenDetail} />
        <Route>404 Not Found</Route>
      </Switch>
    </QueryClientProvider>
  );
}

export default App;
