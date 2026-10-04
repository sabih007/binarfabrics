import { StoreProvider } from "@/components/StoreProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotFoundContent from "@/components/NotFoundContent";

/**
 * Root 404, used for URLs that match no route group at all. It brings its own
 * chrome because the root layout is just the document shell.
 */
export default function NotFound() {
  return (
    <StoreProvider>
      <Header />
      <main><NotFoundContent /></main>
      <Footer />
    </StoreProvider>
  );
}
