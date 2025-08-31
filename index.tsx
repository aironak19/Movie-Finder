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

// --- GLOBAL STATE ---
let currentMovies: Movie[] = [];

// --- DOM ELEMENTS ---
const searchForm = document.getElementById('search-form') as HTMLFormElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const movieGrid = document.getElementById('movie-grid') as HTMLDivElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const welcomeMessage = document.getElementById('welcome-message') as HTMLDivElement;
const sortButtons = document.querySelectorAll('[data-sort]') as NodeListOf<HTMLButtonElement>;
const modal = document.getElementById('movie-modal') as HTMLDivElement;
const modalClose = document.getElementById('modal-close') as HTMLButtonElement;

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
        try {
          // Credits (cast + director)
          const creditsRes = await fetch(`${BASE_URL}/movie/${m.id}/credits?api_key=${API_KEY}`);
          const credits = await creditsRes.json();
          const director = credits.crew?.find((c: any) => c.job === "Director")?.name || "N/A";
          const mainCast = credits.cast?.slice(0, 4).map((c: any) => c.name) || [];

          // Trailer (YouTube)
          const videosRes = await fetch(`${BASE_URL}/movie/${m.id}/videos?api_key=${API_KEY}`);
          const videos = await videosRes.json();
          const youtubeTrailer = videos.results?.find(
            (v: any) => v.site === "YouTube" && v.type === "Trailer"
          );
          const youtubeTrailerId = youtubeTrailer ? youtubeTrailer.key : "";

          // OTT availability
          const providersRes = await fetch(`${BASE_URL}/movie/${m.id}/watch/providers?api_key=${API_KEY}`);
          const providers = await providersRes.json();
          const ottPlatforms =
            providers.results?.IN?.flatrate?.map((p: any) => p.provider_name) || [];

          return {
            title: m.title || "Unknown Title",
            plot: m.overview || "No plot available",
            imdbRating: m.vote_average || 0,
            releaseYear: parseInt(m.release_date?.split("-")[0]) || 0,
            posterUrl: m.poster_path
              ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
              : "https://via.placeholder.com/500x750?text=No+Poster",
            mainCast,
            director,
            ottPlatforms,
            youtubeTrailerId,
          };
        } catch (error) {
          console.error(`Error fetching details for movie ${m.id}:`, error);
          // Return basic movie info if detailed fetch fails
          return {
            title: m.title || "Unknown Title",
            plot: m.overview || "No plot available",
            imdbRating: m.vote_average || 0,
            releaseYear: parseInt(m.release_date?.split("-")[0]) || 0,
            posterUrl: m.poster_path
              ? `https://image.tmdb.org/t/p/w500${m.poster_path}`
              : "https://via.placeholder.com/500x750?text=No+Poster",
            mainCast: [],
            director: "N/A",
            ottPlatforms: [],
            youtubeTrailerId: "",
          };
        }
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

// --- UI FUNCTIONS ---
function renderMovies(movies: Movie[]) {
  movieGrid.innerHTML = '';
  
  movies.forEach((movie) => {
    const movieCard = document.createElement('div');
    movieCard.className = 'movie-card';
    movieCard.innerHTML = `
      <img src="${movie.posterUrl}" alt="${movie.title} poster" loading="lazy" />
      <div class="movie-info">
        <h3>${movie.title}</h3>
        <div class="movie-meta">
          <span class="rating">⭐ ${movie.imdbRating.toFixed(1)}</span>
          <span class="year">${movie.releaseYear}</span>
        </div>
        <p class="plot">${movie.plot.length > 100 ? movie.plot.substring(0, 100) + '...' : movie.plot}</p>
      </div>
    `;
    
    movieCard.addEventListener('click', () => openModal(movie));
    movieGrid.appendChild(movieCard);
  });
}

function openModal(movie: Movie) {
  const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
  const modalPoster = document.getElementById('modal-poster') as HTMLImageElement;
  const modalRating = document.getElementById('modal-rating') as HTMLSpanElement;
  const modalYear = document.getElementById('modal-year') as HTMLSpanElement;
  const modalPlot = document.getElementById('modal-plot') as HTMLParagraphElement;
  const modalDirector = document.getElementById('modal-director') as HTMLSpanElement;
  const modalCast = document.getElementById('modal-cast') as HTMLSpanElement;
  const modalOtt = document.getElementById('modal-ott') as HTMLDivElement;
  const modalYoutube = document.getElementById('modal-youtube') as HTMLIFrameElement;

  modalTitle.textContent = movie.title;
  modalPoster.src = movie.posterUrl;
  modalPoster.alt = `${movie.title} poster`;
  modalRating.textContent = `⭐ ${movie.imdbRating.toFixed(1)}`;
  modalYear.textContent = `${movie.releaseYear}`;
  modalPlot.textContent = movie.plot;
  modalDirector.textContent = movie.director;
  modalCast.textContent = movie.mainCast.join(', ');
  
  // OTT platforms
  modalOtt.innerHTML = movie.ottPlatforms.length > 0 
    ? movie.ottPlatforms.map(platform => `<span class="ott-platform">${platform}</span>`).join('')
    : '<span class="no-ott">Not available on major platforms</span>';
  
  // YouTube trailer
  if (movie.youtubeTrailerId) {
    modalYoutube.src = `https://www.youtube.com/embed/${movie.youtubeTrailerId}`;
    modalYoutube.style.display = 'block';
  } else {
    modalYoutube.style.display = 'none';
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto';
  const modalYoutube = document.getElementById('modal-youtube') as HTMLIFrameElement;
  modalYoutube.src = '';
}

function toggleLoading(show: boolean) {
  if (show) {
    loader.classList.remove('hidden');
  } else {
    loader.classList.add('hidden');
  }
}

function showError(message: string) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

function sortMovies(sortBy: string) {
  let sortedMovies = [...currentMovies];
  
  switch (sortBy) {
    case 'rating':
      sortedMovies.sort((a, b) => b.imdbRating - a.imdbRating);
      break;
    case 'year':
      sortedMovies.sort((a, b) => b.releaseYear - a.releaseYear);
      break;
  }
  
  renderMovies(sortedMovies);
}

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    findMovies(query);
  }
});

sortButtons.forEach(button => {
  button.addEventListener('click', () => {
    const sortBy = button.getAttribute('data-sort');
    if (sortBy && currentMovies.length > 0) {
      sortMovies(sortBy);
    }
  });
});

modalClose.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
    closeModal();
  }
});

