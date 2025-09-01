import React, { useState } from 'react';
import './index.css';

const API_KEY = 'd17573b0e7332f532ccfaa157298c29e';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  release_date: string;
  vote_average: number;
  overview: string;
  cast: string[];
  director: string;
  trailer: string;
  ott: string[];
}

const App: React.FC = () => {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMovieDetails = async (id: number) => {
    const creditsRes = await fetch(`${TMDB_BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const creditsData = await creditsRes.json();
    const cast = creditsData.cast.slice(0, 5).map((c: any) => c.name);
    const director = creditsData.crew.find((c: any) => c.job === 'Director')?.name || 'Unknown';

    const trailerRes = await fetch(`${TMDB_BASE_URL}/movie/${id}/videos?api_key=${API_KEY}`);
    const trailerData = await trailerRes.json();
    const trailer = trailerData.results.find((v: any) => v.type === 'Trailer')?.key || '';

    const ottRes = await fetch(`${TMDB_BASE_URL}/movie/${id}/watch/providers?api_key=${API_KEY}`);
    const ottData = await ottRes.json();
    const ott = ottData.results?.US?.flatrate?.map((p: any) => p.provider_name) || [];

    return { cast, director, trailer, ott };
  };

  const searchMovies = async () => {
    if (!query) return;
    setLoading(true);
    const res = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}`);
    const data = await res.json();

    const moviesWithDetails = await Promise.all(
      data.results.slice(0, 10).map(async (movie: any) => {
        const details = await fetchMovieDetails(movie.id);
        return {
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          overview: movie.overview,
          ...details,
        };
      })
    );
    setMovies(moviesWithDetails);
    setLoading(false);
  };

  return (
    <div className="app">
      <h1>Movie Finder</h1>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Enter mood, genre, or movie..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button onClick={searchMovies}>Search</button>
      </div>
      {loading && <p>Loading...</p>}
      <div className="movie-grid">
        {movies.map((movie) => (
          <div key={movie.id} className="movie-card">
            <img
              src={movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750'}
              alt={movie.title}
            />
            <h3>{movie.title}</h3>
            <p>⭐ {movie.vote_average} | 📅 {movie.release_date}</p>
            <p><strong>Director:</strong> {movie.director}</p>
            <p><strong>Cast:</strong> {movie.cast.join(', ')}</p>
            {movie.ott.length > 0 && <p><strong>Available on:</strong> {movie.ott.join(', ')}</p>}
            {movie.trailer && (
              <a href={`https://www.youtube.com/watch?v=${movie.trailer}`} target="_blank" rel="noopener noreferrer">Watch Trailer</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
