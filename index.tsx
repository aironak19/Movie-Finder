// --- TYPES ---
interface Movie {
  title: string;
  plot: string;
  imdbRating: number;
  releaseYear: number;
  posterUrl: string;
  mainCast: string[];
  director: string;
  ottPlatforms: string[];
  youtubeTrailerId: string;
}

// --- TMDB API SETUP ---
const API_KEY = "d17573b0e7332f532ccfaa157298c29e"; 
const BASE_URL = "https://api.themoviedb.org/3";

// --- API FUNCTIONS ---
async function findMovies(query: string) {
  toggleLoading(true);
  hideError();
  welcomeMessage.classList.add('hidden');
  movieGrid.innerHTML = '';

  try {
    // Step 1: Search for movies
    const res = await fetch(
      `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=1`
    );
    const data = await res.json();

    if (!data.results || data.results.length === 0) {
      showError("No movies found. Try another search.");
      return;
    }

    // Step 2: Enrich each movie with details (credits, trailer, OTT)
    const movies: Movie[] = await Promise.all(
      data.results.slice(0, 8).map(async (m: any) => {
        // Credits (cast + director)
        const creditsRes = await fetch(`${BASE_URL}/movie/${m.id}/credits?api_key=${API_KEY}`);
        const credits = await creditsRes.json();
        const director = credits.crew.find((c: any) => c.job === "Director")?.name || "N/A";
        const mainCast = credits.cast.slice(0, 4).map((c: any) => c.name);

        // Trailer (YouTube)
        const videosRes = await fetch(`${BASE_URL}/movie/${m.id}/videos?api_key=${API_KEY}`);
        const videos = await videosRes.json();
        const youtubeTrailer = videos.results.find(
          (v: any) => v.site === "YouTube" && v.type === "Trailer"
        );
        const youtubeTrailerId = youtubeTrailer ? youtubeTrailer.key : "";

        // OTT availability
        const providersRes = await fetch(`${BASE_URL}/movie/${m.id}/watch/providers?api_key=${API_KEY}`);
        const providers = await providersRes.json();
        const ottPlatforms =
          providers.results?.IN?.flatrate?.map((p: any) => p.provider_name) || [];

        return {
          title: m.title,
          plot: m.overview,
          imdbRating: m.vote_average,
          releaseYear: parseInt(m.release_date?.split("-")[0]) || 0,
          posterUrl: m.poster_path
            ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
            : "https://via.placeholder.com/500x750?text=No+Poster",
          mainCast,
          director,
          ottPlatforms,
          youtubeTrailerId,
        };
      })
    );

    currentMovies = movies;
    renderMovies(currentMovies);
  } catch (err) {
    console.error("Error fetching movies:", err);
    showError("Something went wrong fetching movies.");
  } finally {
    toggleLoading(false);
  }
}
