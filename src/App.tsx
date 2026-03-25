import GuardianScanner from "./pages/guardian-scanner";
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
        <Route path="/" component={GuardianScanner} />
        <Route path="/strike-agent" component={StrikeAgent} />
        <Route path="/guardian-scanner/:chain/:address" component={TokenDetail} />
        <Route>404 Not Found</Route>
      </Switch>
    </QueryClientProvider>
  );
}

export default App;
