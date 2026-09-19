const https = require('https');
const zlib = require('zlib');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const RATINGS_URL = 'https://datasets.imdbws.com/title.ratings.tsv.gz';
const BASICS_URL = 'https://datasets.imdbws.com/title.basics.tsv.gz';
const OUTPUT_FILE = path.join(__dirname, '..', 'imdb_data.json');

const targetIds = new Set();
const movieData = [];

console.log("Starting IMDb dataset processing...");

function downloadAndStream(url, onLine, onComplete) {
    console.log(`Downloading and streaming: ${url}`);
    https.get(url, (response) => {
        if (response.statusCode !== 200) {
            console.error(`Failed to get ${url}: ${response.statusCode}`);
            return;
        }

        const gunzip = zlib.createGunzip();
        response.pipe(gunzip);

        const rl = readline.createInterface({
            input: gunzip,
            crlfDelay: Infinity
        });

        let lineCount = 0;
        rl.on('line', (line) => {
            lineCount++;
            if (lineCount % 1000000 === 0) {
                console.log(`Processed ${lineCount} lines...`);
            }
            onLine(line, lineCount);
        });

        rl.on('close', () => {
            console.log(`Finished streaming ${url}`);
            onComplete();
        });
        
        rl.on('error', (err) => {
             console.error(`Error processing ${url}:`, err);
        });
    }).on('error', (err) => {
        console.error(`HTTPS Error on ${url}:`, err);
    });
}

// Step 1: Process Ratings to find popular movies (> 100,000 votes)
downloadAndStream(RATINGS_URL, (line, index) => {
    if (index === 1) return; // Skip header (tconst, averageRating, numVotes)
    
    const parts = line.split('\t');
    if (parts.length < 3) return;
    
    const tconst = parts[0];
    const rating = parseFloat(parts[1]);
    const numVotes = parseInt(parts[2], 10);
    
    // Filter for highly popular movies to ensure we get well-known Hollywood/Bollywood titles
    if (numVotes > 100000) {
        targetIds.add(tconst);
        movieData.push({
            id: tconst,
            rating: rating,
            votes: numVotes,
            title: "",
            year: "",
            genres: []
        });
    }
}, () => {
    console.log(`Found ${targetIds.size} popular movies in ratings dataset.`);
    
    // Create a map for quick lookup
    const movieMap = new Map();
    movieData.forEach(m => movieMap.set(m.id, m));
    
    // Step 2: Process Basics to get titles and genres
    downloadAndStream(BASICS_URL, (line, index) => {
        if (index === 1) return; // Skip header (tconst, titleType, primaryTitle, originalTitle, isAdult, startYear, endYear, runtimeMinutes, genres)
        
        // Quick check before splitting (optimization)
        const tconst = line.substring(0, line.indexOf('\t'));
        if (!targetIds.has(tconst)) return;
        
        const parts = line.split('\t');
        if (parts.length < 9) return;
        
        const titleType = parts[1];
        if (titleType !== 'movie' && titleType !== 'tvMovie') return; // Only keep movies
        
        const title = parts[2];
        const year = parts[5] === '\\N' ? 'N/A' : parts[5];
        const genres = parts[8] === '\\N' ? [] : parts[8].split(',');
        
        const movie = movieMap.get(tconst);
        if (movie) {
            movie.title = title;
            movie.year = year;
            movie.genres = genres;
        }
    }, () => {
        // Filter out those that didn't get a title (e.g., they were TV series, not movies)
        const finalMovies = movieData.filter(m => m.title !== "");
        
        // Sort by popularity (votes) descending
        finalMovies.sort((a, b) => b.votes - a.votes);
        
        console.log(`Writing ${finalMovies.length} movies to ${OUTPUT_FILE}`);
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ results: finalMovies }, null, 2));
        console.log("Processing complete!");
    });
});
