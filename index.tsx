import { GoogleGenAI, Type } from "@google/genai";

// --- DOM ELEMENT REFERENCES ---
const searchForm = document.getElementById('search-form') as HTMLFormElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const movieGrid = document.getElementById('movie-grid') as HTMLDivElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const welcomeMessage = document.getElementById('welcome-message') as HTMLDivElement;
const sortOptions = document.getElementById('sort-options') as HTMLDivElement;

// Modal elements
const modal = document.getElementById('movie-modal') as HTMLDivElement;
const modalClose = document.getElementById('modal-close') as HTMLButtonElement;
const modalPoster = document.getElementById('modal-poster') as HTMLImageElement;
const modalTitle = document.getElementById('modal-title') as HTMLHeadingElement;
const modalRating = document.getElementById('modal-rating') as HTMLSpanElement;
const modalYear = document.getElementById('modal-year') as HTMLSpanElement;
const modalPlot = document.getElementById('modal-plot') as HTMLParagraphElement;
const modalDirector = document.getElementById('modal-director') as HTMLSpanElement;
const modalCast = document.getElementById('modal-cast') as HTMLSpanElement;
const modalOtt = document.getElementById('modal-ott') as HTMLDivElement;
const modalYoutube = document.getElementById('modal-youtube') as HTMLIFrameElement;

// --- STATE ---
let currentMovies: Movie[] = [];

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

// --- GEMINI API SETUP ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const movieSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "The official title of the movie." },
    plot: { type: Type.STRING, description: "A brief, one-paragraph summary of the movie's plot." },
    imdbRating: { type: Type.NUMBER, description: "The movie's rating on IMDb, as a number (e.g., 8.5)." },
    releaseYear: { type: Type.INTEGER, description: "The year the movie was released." },
    posterUrl: { type: Type.STRING, description: "A direct, public URL to a high-quality movie poster image." },
    mainCast: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of the top 3-4 main actors." },
    director: { type: Type.STRING, description: "The name of the movie's director." },
    ottPlatforms: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of popular streaming services where the movie is available (e.g., 'Netflix', 'Prime Video')." },
    youtubeTrailerId: { type: Type.STRING, description: "The video ID of the movie's official trailer on YouTube." },
  },
  required: ["title", "plot", "imdbRating", "releaseYear", "posterUrl", "mainCast", "director", "ottPlatforms", "youtubeTrailerId"],
};

// --- API FUNCTIONS ---
async function findMovies(query: string) {
  toggleLoading(true);
  hideError();
  welcomeMessage.classList.add('hidden');
  movieGrid.innerHTML = '';

  try {
    const prompt = `You are a movie recommendation expert. Based on the user's request, find 8 relevant movies.
    User request: "${query}"
    Provide a diverse list. For each movie, return all the required information.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: movieSchema,
        },
      },
    });

    const movies: Movie[] = JSON.parse(response.text);
    if (!movies || movies.length === 0) {
      showError("I couldn't find any movies matching your request. Please try being more specific!");
      return;
    }
    currentMovies = movies;
    renderMovies(currentMovies);
  } catch (error) {
    console.error("Error fetching movies:", error);
    showError("Sorry, something went wrong while searching for movies. Please try again later.");
  } finally {
    toggleLoading(false);
  }
}

// --- RENDER FUNCTIONS ---
function renderMovies(movies: Movie[]) {
  movieGrid.innerHTML = '';
  if (movies.length === 0) {
    welcomeMessage.classList.remove('hidden');
    return;
  }
  
  movies.forEach(movie => {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `View details for ${movie.title}`);
    
    card.innerHTML = `
      <img src="${movie.posterUrl}" alt="Poster for ${movie.title}" loading="lazy">
      <div class="movie-card-info">
        <h3>${movie.title}</h3>
        <p>⭐ ${movie.imdbRating}</p>
      </div>
    `;
    
    card.addEventListener('click', () => openModal(movie));
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            openModal(movie);
        }
    });

    movieGrid.appendChild(card);
  });
}

function openModal(movie: Movie) {
  modalPoster.src = movie.posterUrl;
  modalPoster.alt = `Poster for ${movie.title}`;
  modalTitle.textContent = movie.title;
  modalRating.textContent = movie.imdbRating.toString();
  modalYear.textContent = movie.releaseYear.toString();
  modalPlot.textContent = movie.plot;
  modalDirector.textContent = movie.director;
  modalCast.textContent = movie.mainCast.join(', ');

  modalOtt.innerHTML = movie.ottPlatforms.map(platform => 
    `<span class="ott-platform">${platform}</span>`
  ).join('');

  if (movie.youtubeTrailerId) {
      modalYoutube.src = `https://www.youtube.com/embed/${movie.youtubeTrailerId}`;
      (modalYoutube.parentElement as HTMLElement).style.display = 'block';
  } else {
      (modalYoutube.parentElement as HTMLElement).style.display = 'none';
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
  modal.classList.add('hidden');
  modalYoutube.src = ''; // Stop video playback
  document.body.style.overflow = '';
}

// --- UI HELPER FUNCTIONS ---
function toggleLoading(isLoading: boolean) {
  loader.classList.toggle('hidden', !isLoading);
}

function showError(message: string) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

// --- SORTING ---
function sortMovies(sortBy: 'rating' | 'year') {
    if (currentMovies.length === 0) return;

    if (sortBy === 'rating') {
        currentMovies.sort((a, b) => b.imdbRating - a.imdbRating);
    } else if (sortBy === 'year') {
        currentMovies.sort((a, b) => b.releaseYear - a.releaseYear);
    }
    renderMovies(currentMovies);
}

// --- EVENT LISTENERS ---
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    findMovies(query);
  }
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
sortOptions.addEventListener('click', (e) => {
    const target = e.target as HTMLButtonElement;
    const sortBy = target.dataset.sort;
    if (sortBy === 'rating' || sortBy === 'year') {
        sortMovies(sortBy);
    }
});

// --- INITIALIZATION ---
// No initial search, wait for user input.
