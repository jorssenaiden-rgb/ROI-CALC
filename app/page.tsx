import GreaterVancouverSearch from "@/components/GreaterVancouverSearch";
import { loadListings } from "@/lib/loadListings";


export default function Home() {
  const listings = loadListings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <GreaterVancouverSearch listings={listings} />
      </div>
    </div>
  );
}
